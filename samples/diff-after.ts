/**
 * Glass Refraction Engine - Ray Tracing Module
 * This module handles ray-material interaction and caustic generation
 * Updated with performance optimizations and better error handling
 */

import { Material, Vector3D, RenderContext } from './types';

interface RayTraceConfig {
  maxBounces: number;
  samplesPerPixel: number;
  tolerance: number;
  enableAcceleration?: boolean;
}

/**
 * Primary ray tracing function
 * Computes light paths through glass materials with caching
 */
export class RayTracer {
  private config: RayTraceConfig;
  private materials: Map<string, Material>;
  private cache: WeakMap<Material, Float32Array>;
  private fresnelCache: Map<string, number>;

  constructor(config: RayTraceConfig) {
    this.config = { enableAcceleration: true, ...config };
    this.materials = new Map();
    this.cache = new WeakMap();
    this.fresnelCache = new Map();
  }

  /**
   * Add a material to the tracer's library
   */
  addMaterial(name: string, material: Material): void {
    this.materials.set(name, material);
    this.fresnelCache.clear();
  }

  /**
   * Trace a single ray through the scene
   */
  traceRay(origin: Vector3D, direction: Vector3D): Float32Array {
    const result = new Float32Array(3);

    // Normalize direction vector
    const length = Math.sqrt(
      direction.x ** 2 + direction.y ** 2 + direction.z ** 2
    );

    if (length === 0) {
      throw new Error('Invalid direction vector: zero length');
    }

    direction.x /= length;
    direction.y /= length;
    direction.z /= length;

    result[0] = direction.x;
    result[1] = direction.y;
    result[2] = direction.z;

    return result;
  }

  /**
   * Compute Fresnel reflection coefficient with caching
   */
  computeFresnel(
    incidentAngle: number,
    refractionIndex: number
  ): number {
    const cacheKey = `${incidentAngle.toFixed(4)}-${refractionIndex.toFixed(4)}`;

    if (this.fresnelCache.has(cacheKey)) {
      return this.fresnelCache.get(cacheKey)!;
    }

    const n1 = 1.0; // Air
    const n2 = refractionIndex;

    // Apply Snell's law with validation
    const sinTheta = Math.sin(incidentAngle);
    if (sinTheta >= n2 / n1) {
      return 1.0; // Total internal reflection
    }

    const cosTheta = Math.cos(incidentAngle);
    const sqrtTerm = Math.sqrt(1 - sinTheta ** 2);
    const rs = ((n1 * cosTheta) - (n2 * sqrtTerm)) /
               ((n1 * cosTheta) + (n2 * sqrtTerm));

    const result = rs ** 2;
    this.fresnelCache.set(cacheKey, result);
    return result;
  }

  /**
   * Generate caustic pattern for a material
   */
  generateCaustics(
    material: Material,
    context: RenderContext
  ): Uint8Array {
    const width = context.width;
    const height = context.height;
    const data = new Uint8Array(width * height);

    const index = material.refractiveIndex;
    const intensity = material.transmittance;
    const baseValue = (index * intensity * 255) % 256;

    for (let i = 0; i < data.length; i++) {
      // Add slight noise based on position for better visuals
      const noise = (i % 7) * 0.1;
      data[i] = Math.floor((baseValue * (1.0 + noise)) % 256);
    }

    return data;
  }

  /**
   * Render a scene with all materials
   */
  render(context: RenderContext): Uint8Array {
    const pixelData = new Uint8Array(context.width * context.height * 4);

    for (const [name, material] of this.materials) {
      const caustics = this.generateCaustics(material, context);

      for (let i = 0; i < caustics.length; i++) {
        const pixelIndex = i * 4;
        const value = caustics[i];

        pixelData[pixelIndex + 0] = value; // R
        pixelData[pixelIndex + 1] = Math.floor(value * 0.85); // G - increased
        pixelData[pixelIndex + 2] = Math.floor(value * 0.65); // B - increased
        pixelData[pixelIndex + 3] = 255; // A
      }
    }

    return pixelData;
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.fresnelCache.clear();
  }
}

/**
 * Export default ray tracer configuration
 */
export const defaultConfig: RayTraceConfig = {
  maxBounces: 8,
  samplesPerPixel: 256,
  tolerance: 1e-6,
  enableAcceleration: true,
};
