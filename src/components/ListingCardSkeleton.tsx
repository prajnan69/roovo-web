import React from 'react';

interface ListingCardSkeletonProps {
    size?: 'small' | 'normal';
}

const ListingCardSkeleton: React.FC<ListingCardSkeletonProps> = ({ size = 'normal' }) => {
    const w = size === 'small' ? 150 : 180;
    const h = size === 'small' ? 175 : 225;
    return (
        <div className="shrink-0 animate-pulse" style={{ width: w }}>
            <div className="bg-slate-200 rounded-2xl" style={{ height: h }} />
            <div className="mt-2 space-y-2">
                <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="flex gap-2 items-center mt-1">
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-200 rounded w-8" />
                </div>
            </div>
        </div>
    );
};

export default ListingCardSkeleton;
