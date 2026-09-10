import React, { useState, useCallback, ReactNode, FC, useEffect } from 'react';

/** Props interface for GlassPane component */
interface GlassPaneProps {
  readonly title: string;
  refractionIndex: number;
  onRender?: (frameTime: number) => void;
  children?: ReactNode;
}

/** Generic hook for material rendering */
function useGlassRenderer<T extends { quality: string }>(
  props: T,
  callback?: (result: T) => void,
): [T, (newProps: Partial<T>) => void] {
  const [state, setState] = React.useState<T>(props);

  const updateProps = useCallback(
    (partial: Partial<T>) => {
      setState((prev) => {
        const next = { ...prev, ...partial };
        callback?.(next);
        return next;
      });
    },
    [callback],
  );

  return [state, updateProps];
}

/** Functional component with hooks and JSX */
export const GlassPane: FC<GlassPaneProps> = ({
  title,
  refractionIndex,
  onRender,
  children,
}) => {
  const [isRendering, setIsRendering] = useState(false);
  const [fps, setFps] = useState(60);

  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const tick = (currentTime: number) => {
      const delta = currentTime - lastTime;
      const newFps = Math.round(1000 / delta);
      setFps(newFps);
      onRender?.(delta);
      lastTime = currentTime;
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [onRender]);

  // CSS-in-JS object with ternary expressions
  const glassStyle: React.CSSProperties = {
    background: `rgba(255, 255, 255, ${refractionIndex / 10})`,
    backdropFilter: `blur(${10 - refractionIndex}px)`,
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    boxShadow:
      isRendering
        ? '0 8px 32px rgba(0, 0, 255, 0.1)'
        : '0 4px 16px rgba(0, 0, 0, 0.1)',
    transition: 'box-shadow 0.3s ease',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const textColor: string = fps > 50 ? '#10b981' : fps > 30 ? '#f59e0b' : '#ef4444';

  return (
    <div style={glassStyle}>
      <h2 style={{ margin: '0 0 12px 0', color: '#1f2937' }}>{title}</h2>

      {/* Conditional rendering */}
      {children && (
        <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
          {children}
        </div>
      )}

      {/* Complex JSX expression */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {[
          { label: 'FPS', value: fps, unit: 'frame/s' },
          { label: 'Index', value: refractionIndex.toFixed(2), unit: 'n' },
          { label: 'Status', value: isRendering ? 'Active' : 'Idle', unit: '' },
        ].map(({ label, value, unit }) => (
          <div
            key={label}
            style={{
              padding: '8px',
              background: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '6px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '12px', color: '#999' }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: textColor }}>
              {value}
            </div>
            {unit && <div style={{ fontSize: '10px', color: '#bbb' }}>{unit}</div>}
          </div>
        ))}
      </div>

      {/* Button with handler */}
      <button
        onClick={() => setIsRendering(!isRendering)}
        style={{
          padding: '10px 16px',
          background: isRendering ? '#ef4444' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        {isRendering ? 'Stop Rendering' : 'Start Rendering'}
      </button>
    </div>
  );
};

/** Export with default props */
GlassPane.defaultProps = {
  refractionIndex: 1.5,
  onRender: undefined,
  children: undefined,
};

export default GlassPane;
