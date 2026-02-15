"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { infinityPath, rPath, oPath, vPath } from './RoovoLogoNew';

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  // Removed separate 'zoom' stage. 'merge' now handles both hiding text AND zooming.
  const [stage, setStage] = useState<'sketch' | 'solidify' | 'merge' | 'loader'>('sketch');

  // The exact path string from your RoovoLoader file for the morph
  const loaderPathString = "M900.450378,327.092316  C889.395569,321.869659 877.787842,317.556183 867.399780,311.237366  C844.969238,297.593292 827.497864,278.320740 810.860901,258.305328  C809.552307,256.730988 808.058716,255.310471 806.395508,253.547607  C792.509766,271.671021 779.028564,289.147644 765.803650,306.816193  C764.990356,307.902740 765.554077,311.014099 766.579102,312.315399  C771.817749,318.966095 777.143005,325.591156 782.943909,331.748596  C800.794128,350.696259 820.421021,367.405945 844.127319,378.777466  C866.190735,389.360992 889.511475,395.217896 913.742432,398.227600  C946.116699,402.248810 978.093628,401.447266 1008.420044,388.474976  C1071.170410,361.633179 1109.586548,316.241608 1113.723755,245.921585  C1115.653931,213.117035 1111.562378,181.109863 1094.652954,152.440781  C1064.626831,101.532661 1019.274719,73.027054 960.757629,66.425209  C938.091431,63.868038 915.240967,65.031616 892.667114,69.902550  C867.612793,75.308731 843.978943,84.016258 821.901306,97.079819  C793.654175,113.793930 771.019409,136.784393 750.735168,162.009277  C721.057983,198.914810 692.575562,236.778824 663.083313,273.835968  C639.559143,303.394348 611.320435,326.183899 572.721619,333.170746  C540.025208,339.089233 511.129486,331.830933 486.354156,309.381012  C455.805695,281.699829 450.095093,235.879929 462.509552,199.105377  C472.537933,169.398987 493.926636,150.158905 522.942871,140.648193  C553.713013,130.562622 583.995667,134.814575 612.634827,149.973679  C635.524292,162.089462 653.441406,179.910049 669.563782,199.774490  C672.751404,203.701920 675.977234,207.598221 679.765198,212.215546  C693.788330,194.023849 707.288757,176.585266 720.615540,159.015015  C721.331482,158.071167 721.179382,155.580872 720.421143,154.562775  C717.347351,150.435562 713.869019,146.610535 710.557068,142.659653  C676.297119,101.790367 634.250183,75.018456 579.979309,70.024750  C544.252869,66.737396 509.634705,69.674515 476.773468,85.632614  C446.572052,100.299065 422.130188,121.315140 404.059662,149.599930  C391.478271,169.292831 385.011230,191.106903 382.350281,214.191162  C378.613007,246.612686 381.464691,278.565399 395.884369,307.817932  C422.307098,361.420410 466.884156,391.645386 525.567078,400.233795  C541.702515,402.595276 558.652954,402.123932 574.921387,400.261566  C607.125183,396.574799 637.474976,386.239594 665.312988,369.265961  C695.612976,350.791199 719.528137,325.429657 741.245422,297.862610  C767.652405,264.342590 793.579895,230.445190 819.948303,196.894562  C843.181091,167.333420 870.976990,144.114731 908.693542,135.393600  C931.375427,130.148911 954.309143,129.660477 975.844910,138.733536  C1010.609985,153.380157 1032.893921,178.924423 1037.714478,217.545074  C1040.247192,237.836761 1039.302002,257.940369 1030.750122,276.801270  C1018.634033,303.523163 998.294495,321.190552 969.943665,329.428802  C946.785522,336.158142 923.915466,334.596283 900.450378,327.092316";

  useEffect(() => {
    const sequence = async () => {
      // 1. Sketch Phase: Draw Outlines
      await new Promise(r => setTimeout(r, 1000));

      // 2. Solidify Phase: Fill Black
      setStage('solidify');
      await new Promise(r => setTimeout(r, 1500));

      // 3. Merge & Zoom Phase:
      // TEXT slides behind Infinity AND Infinity moves/zooms to loader position simultaneously.
      setStage('merge');
      await new Promise(r => setTimeout(r, 1200)); // Wait for the merge/zoom to finish

      // 4. Loader Phase: Switch to Indigo looping animation
      setStage('loader');

      // 5. Completion callback
      setTimeout(() => {
        onAnimationComplete();
      }, 2500);
    };

    sequence();
  }, [onAnimationComplete]);

  return (
    <motion.div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        // === KEY CHANGE: ViewBox Animates DURING 'merge' ===
        // This creates the seamless "Move towards loader" effect while text hides.
        animate={
          stage === 'merge' || stage === 'loader'
            ? { viewBox: "350 50 800 380", width: 128 } // Target: Loader ViewBox & Size
            : { viewBox: "0 0 1826 404", width: 280 }   // Initial: Logo ViewBox & Size
        }
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="h-auto"
      >
        {/* ========================================================
             LAYER 1: Text Elements ("R" and "vo")
           ======================================================== */}

        {/* Left Group: "R" */}
        <motion.g
          initial={{ x: 0, opacity: 1 }}
          animate={
            (stage === 'merge' || stage === 'loader')
              ? { x: 650, opacity: 0 } // Slides RIGHT (towards center)
              : { x: 0, opacity: 1 }
          }
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          <motion.path
            d={rPath}
            initial={{ pathLength: 0, fill: "rgba(0,0,0,0)", stroke: "#000", strokeWidth: 3 }}
            animate={
              stage === 'sketch'
                ? { pathLength: 1, fill: "rgba(0,0,0,0)", stroke: "#000" }
                : { pathLength: 1, fill: "#000", stroke: "rgba(0,0,0,0)" }
            }
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </motion.g>

        {/* Right Group: "vo" */}
        <motion.g
          initial={{ x: 0, opacity: 1 }}
          animate={
            (stage === 'merge' || stage === 'loader')
              ? { x: -650, opacity: 0 } // Slides LEFT (towards center)
              : { x: 0, opacity: 1 }
          }
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          <motion.path
            d={oPath}
            initial={{ pathLength: 0, fill: "rgba(0,0,0,0)", stroke: "#000", strokeWidth: 3 }}
            animate={
              stage === 'sketch'
                ? { pathLength: 1, fill: "rgba(0,0,0,0)", stroke: "#000" }
                : { pathLength: 1, fill: "#000", stroke: "rgba(0,0,0,0)" }
            }
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
          />
          <motion.path
            d={vPath}
            initial={{ pathLength: 0, fill: "rgba(0,0,0,0)", stroke: "#000", strokeWidth: 3 }}
            animate={
              stage === 'sketch'
                ? { pathLength: 1, fill: "rgba(0,0,0,0)", stroke: "#000" }
                : { pathLength: 1, fill: "#000", stroke: "rgba(0,0,0,0)" }
            }
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.3 }}
          />
        </motion.g>

        {/* ========================================================
             LAYER 2: The Blocker
             (Hides text as it slides behind, then fades out)
           ======================================================== */}
        <motion.path
          d={infinityPath}
          fill="#fff"
          stroke="#fff"
          strokeWidth="25"
          // Fade out ONLY when we actually switch to the loader (outline) stage
          initial={{ opacity: 1 }}
          animate={{ opacity: stage === 'loader' ? 0 : 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* ========================================================
             LAYER 3: The Infinity Symbol
           ======================================================== */}
        <g>
          {/* 3A: The Solid Black Logo Infinity 
              Moves/Scales during 'merge', then Fades out for 'loader'
          */}
          <motion.path
            d={infinityPath}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={
              stage === 'sketch' ? { opacity: 1, scale: 1 } :
                stage === 'solidify' ? { opacity: 1 } :
                  stage === 'merge' ? { scale: 1 } : // Stays consistent while ViewBox zooms
                    stage === 'loader' ? { opacity: 0 } : // Fades out to reveal indigo loader
                      { scale: 1 }
            }
            transition={{ duration: 1, ease: "easeInOut" }}
            fill="#000"
          />

          {/* 3B: The Indigo Loader Infinity 
              Appears when 'loader' stage starts
          */}
          <AnimatePresence>
            {stage === 'loader' && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Ghost Path */}
                <path
                  d={loaderPathString}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="10"
                  strokeOpacity="0.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Active Animated Path */}
                <motion.path
                  d={loaderPathString}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: [0, 1, 1, 0],
                    opacity: [0, 1, 1, 0],
                    pathOffset: [0, 0, 1, 1]
                  }}
                  transition={{
                    duration: 3,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 0
                  }}
                />
              </motion.g>
            )}
          </AnimatePresence>
        </g>
      </motion.svg>
    </motion.div>
  );
};

export default SplashScreen;