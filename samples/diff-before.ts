/**
 * Glass Refraction Engine - Ray Tracing Module
 * This module handles ray-material interaction and caustic generation
 */

import { Material, Vector3D, RenderContext } from './types';

interface RayTraceConfig {
  maxBounces: number;
  samplesPerPixel: number;
  tolerance: number;
}

/**
 * Primary ray tracing function
 * Computes light paths through glass materials
 */
export class RayTracer {
  private config: RayTraceConfig;
  private materials: Map<string, Material>;
  private cache: WeakMap<Material, Float32Array>;

  constructor(config: RayTraceConfig) {
    this.config = config;
    this.materials = new Map();
    this.cache = new WeakMap();
  }

  /**
   * Add a material to the tracer's library
   */
  addMaterial(name: string, material: Material): void {
    this.materials.set(name, material);
  }

  /**
   * Trace a single ray through the scene
   */
  traceRay(origin: Vector3D, direction: Vector3D): Float32Array {
    const result = new Float32Array(3);

    // Normalize direction
    const length = Math.sqrt(
      direction.x ** 2 + direction.y ** 2 + direction.z ** 2
    );

    if (length === 0) {
      return result;
    }

    direction.x /= length;
    direction.y /= length;
    direction.z /= length;

    return result;
  }

  /**
   * Compute Fresnel reflection coefficient
   */
  computeFresnel(
    incidentAngle: number,
    refractionIndex: number
  ): number {
    const n1 = 1.0; // Air
    const n2 = refractionIndex;

    // Apply Snell's law
    const sinTheta = Math.sin(incidentAngle);
    if (sinTheta >= n2 / n1) {
      return 1.0; // Total internal reflection
    }

    const cosTheta = Math.cos(incidentAngle);
    const rs = ((n1 * cosTheta) - (n2 * Math.sqrt(1 - sinTheta ** 2))) /
               ((n1 * cosTheta) + (n2 * Math.sqrt(1 - sinTheta ** 2)));

    return rs ** 2;
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

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.floor((index * intensity * 255) % 256);
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
        pixelData[pixelIndex + 1] = Math.floor(value * 0.8); // G
        pixelData[pixelIndex + 2] = Math.floor(value * 0.6); // B
        pixelData[pixelIndex + 3] = 255; // A
      }
    }

    return pixelData;
  }
}

/**
 * Export default ray tracer configuration
 */
export const defaultConfig: RayTraceConfig = {
  maxBounces: 4,
  samplesPerPixel: 128,
  tolerance: 1e-5,
};
