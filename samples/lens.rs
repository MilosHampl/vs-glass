/// Glass lens rendering module with advanced optics simulation.
///
/// This module provides generic lens types with trait implementations
/// and macro utilities for material composition.

use std::fmt;
use std::marker::PhantomData;

/// Refractive index enumeration with custom derives
#[derive(Debug, Clone, Copy, PartialEq)]
enum RefractiveIndex {
    Glass,
    Diamond,
    Sapphire,
    Custom(f64),
}

impl RefractiveIndex {
    fn value(&self) -> f64 {
        match self {
            Self::Glass => 1.5,
            Self::Diamond => 2.42,
            Self::Sapphire => 1.76,
            Self::Custom(n) => *n,
        }
    }
}

/// Surface property structure with lifetimes
#[derive(Debug)]
struct Surface<'a> {
    name: &'a str,
    roughness: f64,
    transmittance: f64,
}

/// Generic lens structure with type parameter bounds
struct Lens<T: Copy + fmt::Debug> {
    material: T,
    focal_length: f64,
    aperture: f32,
    _phantom: PhantomData<T>,
}

impl<T: Copy + fmt::Debug> Lens<T> {
    /// Create new lens with bounds checking
    const MAX_APERTURE: f32 = 64.0;

    fn new(material: T, focal_length: f64, aperture: f32) -> Result<Self, String> {
        if aperture <= 0.0 || aperture > Self::MAX_APERTURE {
            return Err("Invalid aperture".into());
        }
        Ok(Lens {
            material,
            focal_length,
            aperture,
            _phantom: PhantomData,
        })
    }
}

/// Trait for optical rendering
trait OpticalRender {
    fn render(&self) -> String;
    fn get_quality(&self) -> Quality;
}

#[derive(Debug, Clone, Copy)]
enum Quality {
    Low,
    Medium,
    High,
}

/// Implementation for RefractiveIndex type
impl OpticalRender for RefractiveIndex {
    fn render(&self) -> String {
        format!("Rendering {:?} (n={})", self, self.value())
    }

    fn get_quality(&self) -> Quality {
        match self.value() {
            n if n > 2.0 => Quality::High,
            n if n > 1.5 => Quality::Medium,
            _ => Quality::Low,
        }
    }
}

/// Implementation block for generic Lens
impl<T: Copy + fmt::Debug + OpticalRender> Lens<T> {
    fn compute_image_distance(&self, object_distance: f64) -> Option<f64> {
        let f = self.focal_length;
        let u = object_distance;

        if (1.0 / u) + (1.0 / f) == 0.0 {
            return None;
        }

        Some(f * u / (u - f))
    }

    fn get_magnification(&self, object_distance: f64) -> Result<f64, &'static str> {
        self.compute_image_distance(object_distance)
            .ok_or("Invalid distance")
            .map(|v| -v / object_distance)
    }
}

/// Macro for creating material configurations
macro_rules! glass_config {
    ($name:ident, $index:expr, $aperture:expr) => {
        {
            println!("Creating {} config", stringify!($name));
            let idx = RefractiveIndex::Custom($index);
            Lens::new(idx, 50.0, $aperture).expect("Config creation failed")
        }
    };
}

/// Function with closure and generic constraints
fn process_rays<F>(count: usize, transform: F) -> Vec<f64>
where
    F: Fn(usize) -> f64,
{
    (0..count).map(transform).collect()
}

/// Function demonstrating match patterns and Option handling
fn trace_ray(angle: f64) -> Option<f64> {
    match angle {
        x if x < 0.0 => None,
        x if x > 90.0 => None,
        x => Some(x * std::f64::consts::PI / 180.0),
    }
}

/// Module for advanced computations
mod caustics {
    use super::*;

    pub fn compute(intensity: f32, decay: f32) -> f32 {
        intensity * (1.0 - decay)
    }

    pub const SAMPLE_RATE: usize = 1024;
}

/// Unsafe block for raw pointer manipulation (demonstration)
unsafe fn compute_brightness(values: *const f64, len: usize) -> f64 {
    let mut sum = 0.0;
    for i in 0..len {
        sum += *values.add(i);
    }
    sum / len as f64
}

/// Public interface function
pub fn main() {
    // Hex and float literals
    let quality_bits = 0xFF00FF;
    let intensity = 0.75_f64;
    let decay_exp = 1.5e-2_f32;

    println!("Glass Lens Renderer v0.1");

    // Vec macro with array initialization
    let materials = vec![
        RefractiveIndex::Glass,
        RefractiveIndex::Diamond,
        RefractiveIndex::Custom(1.8),
    ];

    // Iterate with closure
    materials.iter().for_each(|mat| {
        println!("{}", mat.render());
    });

    // Glass config macro
    let lens = glass_config!(primary, 1.52, 32.0);
    println!("Lens created: {:?}", lens.material);

    // Process rays with custom transformation
    let rays = process_rays(8, |i| (i as f64) * 0.125);
    println!("Processed {} rays", rays.len());

    // Demonstrate Result handling with ?
    if let Ok(mag) = lens.get_magnification(30.0) {
        println!("Magnification: {:.2}x", mag);
    }

    // Match on Option
    if let Some(rad) = trace_ray(45.0) {
        println!("Ray angle in radians: {:.4}", rad);
    }

    // Unsafe block usage
    let sample_data: [f64; 4] = [0.2, 0.4, 0.6, 0.8];
    let brightness = unsafe { compute_brightness(sample_data.as_ptr(), sample_data.len()) };
    println!("Average brightness: {:.2}", brightness);

    // Module function call
    let caustic = caustics::compute(intensity, decay_exp);
    println!("Caustic intensity: {}", caustic);
}
