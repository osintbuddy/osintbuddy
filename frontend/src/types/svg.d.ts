import { SVGAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      ellipse: SVGAttributes<SVGEllipseElement> & {
          path?: string;
      }
      animateMotion: SVGAttributes<SVGAnimateMotionElement> & {
        path?: string;
        
      };
    }
  }
}

// Extend SVGAnimateMotionElement if it doesn't exist
declare global {
  interface SVGAnimateMotionElement extends SVGAnimationElement {
    path: string;
  }
}