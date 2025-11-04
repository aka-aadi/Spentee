import React from 'react';
import { motion } from 'framer-motion';
import './LoginDoodles.css';

const LoginDoodles = ({ 
  isWatching, 
  isLookingAtButton, 
  isShakingHead, 
  isNodding, 
  isLookingAway,
  passwordVisible 
}) => {
  return (
    <div className="doodles-container">
      <motion.div 
        className="doodle-character"
        animate={{
          y: isLookingAtButton ? -10 : 0,
          rotate: isLookingAway ? -15 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Head */}
        <div className="doodle-head">
          {/* Eyes */}
          <div className="doodle-eyes">
            <motion.div 
              className="doodle-eye"
              animate={{
                x: isLookingAtButton ? 3 : isLookingAway ? -5 : 0,
                y: isLookingAtButton ? -2 : 0,
                scale: isShakingHead ? [1, 0.8, 1] : isNodding ? [1, 1.2, 1] : 1,
              }}
              transition={{ 
                duration: isShakingHead ? 0.2 : 0.3,
                repeat: isShakingHead ? 3 : 0,
              }}
            />
            <motion.div 
              className="doodle-eye"
              animate={{
                x: isLookingAtButton ? 3 : isLookingAway ? -5 : 0,
                y: isLookingAtButton ? -2 : 0,
                scale: isShakingHead ? [1, 0.8, 1] : isNodding ? [1, 1.2, 1] : 1,
              }}
              transition={{ 
                duration: isShakingHead ? 0.2 : 0.3,
                repeat: isShakingHead ? 3 : 0,
              }}
            />
          </div>
          
          {/* Mouth */}
          <motion.div 
            className="doodle-mouth"
            animate={{
              scaleY: isNodding ? 1.2 : isShakingHead ? 0.8 : 1,
              rotate: isShakingHead ? [0, -5, 5, -5, 0] : 0,
            }}
            transition={{ 
              duration: isShakingHead ? 0.5 : 0.3,
              repeat: isShakingHead ? 1 : 0,
            }}
          />
        </div>
        
        {/* Body */}
        <div className="doodle-body" />
        
        {/* Arms */}
        <motion.div 
          className="doodle-arm doodle-arm-left"
          animate={{
            rotate: isNodding ? [0, 10, -10, 10, 0] : 0,
          }}
          transition={{ 
            duration: 0.5,
            repeat: isNodding ? 1 : 0,
          }}
        />
        <motion.div 
          className="doodle-arm doodle-arm-right"
          animate={{
            rotate: isNodding ? [0, -10, 10, -10, 0] : 0,
          }}
          transition={{ 
            duration: 0.5,
            repeat: isNodding ? 1 : 0,
          }}
        />
        
        {/* Speech bubble for "NO" */}
        {isShakingHead && (
          <motion.div
            className="speech-bubble speech-no"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            NO
          </motion.div>
        )}
        
        {/* Speech bubble for "YES" */}
        {isNodding && (
          <motion.div
            className="speech-bubble speech-yes"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            ✓
          </motion.div>
        )}
      </motion.div>
      
      {/* Second doodle character */}
      <motion.div 
        className="doodle-character doodle-character-2"
        animate={{
          y: isLookingAtButton ? -10 : 0,
          rotate: isLookingAway ? 15 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="doodle-head">
          <div className="doodle-eyes">
            <motion.div 
              className="doodle-eye"
              animate={{
                x: isLookingAtButton ? -3 : isLookingAway ? 5 : 0,
                y: isLookingAtButton ? -2 : 0,
                scale: isShakingHead ? [1, 0.8, 1] : isNodding ? [1, 1.2, 1] : 1,
              }}
              transition={{ 
                duration: isShakingHead ? 0.2 : 0.3,
                repeat: isShakingHead ? 3 : 0,
              }}
            />
            <motion.div 
              className="doodle-eye"
              animate={{
                x: isLookingAtButton ? -3 : isLookingAway ? 5 : 0,
                y: isLookingAtButton ? -2 : 0,
                scale: isShakingHead ? [1, 0.8, 1] : isNodding ? [1, 1.2, 1] : 1,
              }}
              transition={{ 
                duration: isShakingHead ? 0.2 : 0.3,
                repeat: isShakingHead ? 3 : 0,
              }}
            />
          </div>
          <motion.div 
            className="doodle-mouth"
            animate={{
              scaleY: isNodding ? 1.2 : isShakingHead ? 0.8 : 1,
              rotate: isShakingHead ? [0, 5, -5, 5, 0] : 0,
            }}
            transition={{ 
              duration: isShakingHead ? 0.5 : 0.3,
              repeat: isShakingHead ? 1 : 0,
            }}
          />
        </div>
        <div className="doodle-body" />
        <motion.div 
          className="doodle-arm doodle-arm-left"
          animate={{
            rotate: isNodding ? [0, 10, -10, 10, 0] : 0,
          }}
          transition={{ 
            duration: 0.5,
            repeat: isNodding ? 1 : 0,
          }}
        />
        <motion.div 
          className="doodle-arm doodle-arm-right"
          animate={{
            rotate: isNodding ? [0, -10, 10, -10, 0] : 0,
          }}
          transition={{ 
            duration: 0.5,
            repeat: isNodding ? 1 : 0,
          }}
        />
      </motion.div>
    </div>
  );
};

export default LoginDoodles;

