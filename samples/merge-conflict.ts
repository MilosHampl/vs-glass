/**
 * Glass Material Renderer - Material Blending Engine
 * Demonstrates merge conflict resolution for VS Glass theme testing
 */

import { Material, BlendMode, RenderResult } from './types';

/**
 * Material mixer for combining glass properties
 */
export class MaterialMixer {
  private materials: Material[] = [];
  private weights: number[] = [];

<<<<<<< HEAD
  /**
   * Blend materials with linear interpolation
   * Uses basic averaging of refractive indices
   */
  blendMaterials(
    materials: Material[],
    weights: number[],
  ): Material {
    if (materials.length === 0) {
      throw new Error('No materials to blend');
    }

    // Validate weights sum to 1.0
    const weightSum = weights.reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1.0) > 0.001) {
      throw new Error(`Weights must sum to 1.0, got ${weightSum}`);
    }

    let blendedIndex = 0;
    let blendedTransmittance = 0;
    let blendedRoughness = 0;

    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      const weight = weights[i];

      blendedIndex += material.refractiveIndex * weight;
      blendedTransmittance += material.transmittance * weight;
      blendedRoughness += material.roughness * weight;
    }

    return {
      name: 'blended',
      refractiveIndex: blendedIndex,
      transmittance: blendedTransmittance,
      roughness: blendedRoughness,
    };
  }

  /**
   * Compute caustic intensity with wavelength consideration
   */
  computeCaustics(material: Material, wavelength: number): number {
    const baseIntensity = material.transmittance * (2.5 - material.refractiveIndex);
    const wavelengthFactor = 1.0 + (wavelength - 550) / 1000;
    return baseIntensity * wavelengthFactor;
  }

||||||| merged-base
  /**
   * Placeholder for original blend function
   */
  blendMaterials(
    materials: Material[],
    weights: number[],
  ): Material {
    return materials[0];
  }

=======
  /**
   * Advanced spectral blending with wavelength consideration
   * Uses logarithmic interpolation for better optical accuracy
   */
  blendMaterials(
    materials: Material[],
    weights: number[],
    blendMode: BlendMode = 'linear',
  ): Material {
    if (materials.length === 0) {
      throw new Error('No materials to blend');
    }

    // Normalize weights
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / weightSum);

    let blendedIndex = 0;
    let blendedTransmittance = 0;
    let blendedRoughness = 0;

    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      const weight = normalizedWeights[i];

      if (blendMode === 'logarithmic') {
        blendedIndex += Math.log(material.refractiveIndex) * weight;
        blendedTransmittance += Math.sqrt(material.transmittance) * weight;
      } else {
        blendedIndex += material.refractiveIndex * weight;
        blendedTransmittance += material.transmittance * weight;
      }
      blendedRoughness += material.roughness * weight;
    }

    if (blendMode === 'logarithmic') {
      blendedIndex = Math.exp(blendedIndex);
      blendedTransmittance = blendedTransmittance ** 2;
    }

    return {
      name: 'blended-spectral',
      refractiveIndex: blendedIndex,
      transmittance: blendedTransmittance,
      roughness: blendedRoughness,
    };
  }

  /**
   * Compute spectral caustic intensity with advanced rendering
   */
  computeCaustics(
    material: Material,
    wavelength: number,
    intensity: number = 1.0,
  ): number {
    const dispersivity = 0.003;
    const baseIntensity = material.transmittance * (2.5 - material.refractiveIndex);
    const spectralShift = Math.sin((wavelength - 550) * dispersivity);
    return (baseIntensity * spectralShift * intensity) + 0.1;
  }

>>>>>>> feature/specular
}

/**
 * Material library manager
 */
export class MaterialLibrary {
  private materials: Map<string, Material> = new Map();

  /**
   * Register a new material
   */
  register(name: string, material: Material): void {
    this.materials.set(name, material);
  }

  /**
   * Retrieve material by name
   */
  get(name: string): Material | undefined {
    return this.materials.get(name);
  }

  /**
   * List all available materials
   */
  listMaterials(): string[] {
    return Array.from(this.materials.keys());
  }

  /**
   * Get statistics for a material
   */
  getStats(name: string): Record<string, number> | null {
    const material = this.materials.get(name);
    if (!material) return null;

    return {
      refractionIndex: material.refractiveIndex,
      transmittance: material.transmittance,
      roughness: material.roughness,
    };
  }
}

/**
 * Render pipeline orchestrator
 */
export function renderScene(
  mixer: MaterialMixer,
  library: MaterialLibrary,
  config: { width: number; height: number },
): RenderResult {
  const startTime = performance.now();

  // Render logic here
  const result: RenderResult = {
    width: config.width,
    height: config.height,
    pixels: new Uint8Array(config.width * config.height * 4),
    renderTime: performance.now() - startTime,
  };

  return result;
}
