/**
 * Type declarations for deck.gl modules
 */

declare module '@deck.gl/react' {
  import { ComponentType } from 'react';
  
  export interface DeckGLProps {
    initialViewState?: any;
    viewState?: any;
    onViewStateChange?: (params: { viewState: any }) => void;
    controller?: boolean | object;
    layers?: any[];
    getCursor?: (params: { isHovering: boolean }) => string;
    children?: React.ReactNode;
  }
  
  export const DeckGL: ComponentType<DeckGLProps>;
}

declare module '@deck.gl/layers' {
  export class ScatterplotLayer {
    constructor(props: any);
  }
  
  export class GeoJsonLayer {
    constructor(props: any);
  }
}

declare module '@deck.gl/core' {
  export * from '@deck.gl/layers';
}
