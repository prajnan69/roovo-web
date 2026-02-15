/**
 * Video conversion utilities for Supabase storage
 * Converts videos to WebP format before upload
 */

/**
 * Convert video file to WebP format using canvas extraction
 * Note: For full video conversion, this extracts a frame. 
 * For actual video compression, consider using FFmpeg.wasm
 */
export const convertVideoToWebP = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
        }

        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Seek to 1 second to get a good frame
            video.currentTime = 1;
        };

        video.onseeked = () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(video.src);
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to convert video to WebP'));
                    }
                },
                'image/webp',
                0.8 // Quality
            );
        };

        video.onerror = () => {
            URL.revokeObjectURL(video.src);
            reject(new Error('Failed to load video'));
        };
    });
};

/**
 * Upload video to Supabase storage
 * @param file - Video file to upload
 * @param bucket - Supabase storage bucket name
 * @param path - Storage path (e.g., 'verification-videos/host-123.webp')
 */
export const uploadVideoToSupabase = async (
    file: File,
    bucket: string = 'verification-videos',
    path: string
): Promise<string> => {
    const { default: supabase } = await import('@/services/api');

    try {
        // Upload to Supabase
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                contentType: file.type,
                upsert: true,
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Video upload failed:', error);
        throw new Error('Failed to upload verification video');
    }
};

/**
 * Validate video file
 */
export const validateVideoFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Please upload a video file (MP4, MOV, or WebM)',
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'Video file must be less than 100MB',
        };
    }

    return { valid: true };
};

/**
 * Compress video using Canvas and MediaRecorder
 * Resizes to 720p max width and reduces bitrate
 */
export const compressVideo = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.src = URL.createObjectURL(file);

        video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                URL.revokeObjectURL(video.src);
                reject(new Error('Canvas context not available'));
                return;
            }

            // Calculate new dimensions (max 720p width)
            const MAX_WIDTH = 720;
            let width = video.videoWidth;
            let height = video.videoHeight;

            if (width > MAX_WIDTH) {
                height = (height * MAX_WIDTH) / width;
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;

            // Choose supported mime type
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? 'video/webm;codecs=vp9'
                : MediaRecorder.isTypeSupported('video/webm')
                    ? 'video/webm'
                    : 'video/mp4'; // Safari fallback

            const stream = canvas.captureStream(30); // 30 FPS
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 1000000 // 1 Mbps
            });

            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                URL.revokeObjectURL(video.src);
                console.log(`Video compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
                resolve(blob);
            };

            mediaRecorder.start();

            // Draw frames
            const drawFrame = () => {
                if (video.paused || video.ended) return;
                ctx.drawImage(video, 0, 0, width, height);
                requestAnimationFrame(drawFrame);
            };

            video.onplay = () => {
                drawFrame();
            };

            video.onended = () => {
                mediaRecorder.stop();
            };

            video.onerror = (e) => {
                URL.revokeObjectURL(video.src);
                reject(new Error('Video playback failed during compression'));
            };

            // Start playing to trigger recording
            video.play().catch(e => {
                reject(new Error('Failed to play video for compression: ' + e.message));
            });
        };

        video.onerror = () => {
            URL.revokeObjectURL(video.src);
            reject(new Error('Failed to load video metadata'));
        };
    });
};
