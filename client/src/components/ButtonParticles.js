import { useCallback, useRef } from 'react';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';

const ButtonParticles = ({ isHovered, isClicked }) => {
  const containerRef = useRef(null);

  const particlesInit = useCallback(async (engine) => {
    try {
      await loadSlim(engine);
    } catch (error) {
      console.error('Error loading particles:', error);
    }
  }, []);

  return (
    <div ref={containerRef} className="button-particles-container">
      <Particles
        id="button-particles"
        init={particlesInit}
        options={{
          background: {
            color: {
              value: 'transparent',
            },
          },
          fpsLimit: 120,
          interactivity: {
            events: {
              onHover: {
                enable: isHovered,
                mode: 'bubble',
              },
              onClick: {
                enable: isClicked,
                mode: 'push',
              },
            },
            modes: {
              bubble: {
                distance: 200,
                duration: 0.4,
                size: 4,
                opacity: 0.8,
              },
              push: {
                quantity: 4,
              },
            },
          },
          particles: {
            color: {
              value: ['#ffffff', '#667eea', '#764ba2'],
            },
            links: {
              enable: false,
            },
            move: {
              enable: true,
              outModes: {
                default: 'destroy',
              },
              random: true,
              speed: isHovered ? 3 : 1,
              straight: false,
            },
            number: {
              density: {
                enable: true,
                area: 200,
              },
              value: isHovered ? 30 : 10,
            },
            opacity: {
              value: 0.8,
              animation: {
                enable: true,
                speed: 1,
                minimumValue: 0.1,
                sync: false,
              },
            },
            shape: {
              type: ['circle', 'triangle'],
            },
            size: {
              value: {
                min: 2,
                max: 5,
              },
              animation: {
                enable: true,
                speed: 2,
                minimumValue: 0.5,
                sync: false,
              },
            },
          },
          detectRetina: true,
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default ButtonParticles;

