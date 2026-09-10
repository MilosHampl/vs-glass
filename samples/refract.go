package glass

import (
	"fmt"
	"math"
	"sync"
	"time"
)

// Quality enumeration using iota
const (
	QualityLow Quality = iota
	QualityMedium
	QualityHigh
	QualityUltra
)

type Quality int

// MaterialType string enumeration
type MaterialType string

const (
	TypeGlass   MaterialType = "glass"
	TypeDiamond MaterialType = "diamond"
	TypeSapphire MaterialType = "sapphire"
)

// Material structure with struct tags
type Material struct {
	Name             string        `json:"name" db:"material_name"`
	RefractiveIndex  float64       `json:"index" db:"refractive_index"`
	Transmittance    float64       `json:"transmittance" db:"transmittance"`
	Type             MaterialType  `json:"type" db:"material_type"`
	Quality          Quality       `json:"quality" db:"quality_level"`
	MaxProcessingFPS int           `json:"fps" db:"max_fps"`
}

// Renderer interface for material rendering
type Renderer interface {
	Render() error
	GetProperties() *Material
	OptimizeFrameBuffer(data []float64) error
}

// GlassRenderer implements Renderer interface
type GlassRenderer struct {
	material *Material
	mutex    sync.RWMutex
	cache    map[string]interface{}
}

// NewGlassRenderer factory function
func NewGlassRenderer(mat *Material) *GlassRenderer {
	return &GlassRenderer{
		material: mat,
		cache:    make(map[string]interface{}),
	}
}

// Render method with defer and error handling
func (gr *GlassRenderer) Render() error {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("Recovered from panic: %v\n", r)
		}
	}()

	gr.mutex.Lock()
	defer gr.mutex.Unlock()

	if gr.material == nil {
		return fmt.Errorf("material not initialized")
	}

	fmt.Printf(
		"Rendering %s (n=%.2f, quality=%v)\n",
		gr.material.Name,
		gr.material.RefractiveIndex,
		gr.material.Quality,
	)

	return nil
}

// GetProperties method
func (gr *GlassRenderer) GetProperties() *Material {
	gr.mutex.RLock()
	defer gr.mutex.RUnlock()
	return gr.material
}

// OptimizeFrameBuffer method with slice processing
func (gr *GlassRenderer) OptimizeFrameBuffer(data []float64) error {
	if len(data) == 0 {
		return fmt.Errorf("empty data buffer")
	}

	gr.mutex.Lock()
	defer gr.mutex.Unlock()

	sum := 0.0
	for _, val := range data {
		sum += val
	}
	avg := sum / float64(len(data))
	gr.cache["average"] = avg

	return nil
}

// ComputeCaustics function with generic pattern
func ComputeCaustics[T float32 | float64](intensity T, material *Material) T {
	var result T

	// Type switch would be checked at compile time
	factorF32 := T(material.RefractiveIndex - 1.0)
	result = intensity * factorF32

	return result
}

// RayTracer struct with channel handling
type RayTracer struct {
	rays    chan float64
	results chan float64
	done    chan bool
}

// NewRayTracer factory
func NewRayTracer(bufferSize int) *RayTracer {
	return &RayTracer{
		rays:    make(chan float64, bufferSize),
		results: make(chan float64, bufferSize),
		done:    make(chan bool),
	}
}

// ProcessRays method demonstrating goroutines and channels
func (rt *RayTracer) ProcessRays(count int) []float64 {
	var wg sync.WaitGroup
	output := make([]float64, 0, count)
	mu := sync.Mutex{}

	// Spawn worker goroutine
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			select {
			case ray := <-rt.rays:
				result := math.Sin(ray) * math.Cos(ray)
				mu.Lock()
				output = append(output, result)
				mu.Unlock()
				rt.results <- result
			case <-rt.done:
				close(rt.results)
				return
			}
		}
	}()

	// Send rays
	for i := 0; i < count; i++ {
		angle := float64(i) * (math.Pi / float64(count))
		rt.rays <- angle
	}

	// Signal completion
	go func() {
		time.Sleep(100 * time.Millisecond)
		rt.done <- true
	}()

	wg.Wait()
	return output
}

// FrameProcessor with generic constraints
type FrameProcessor[T interface {
	Render() error
}] struct {
	renderer T
	frameChan chan int
}

// ProcessFrame generic method
func (fp *FrameProcessor[T]) ProcessFrame(frameNum int) error {
	if err := fp.renderer.Render(); err != nil {
		return fmt.Errorf("render failed: %w", err)
	}

	fp.frameChan <- frameNum
	return nil
}

// Helper function with named return values
func ComputeFresnelCoefficient(index float64) (coefficient float64, err error) {
	if index < 1.0 {
		err = fmt.Errorf("invalid refractive index: %.2f", index)
		return
	}

	n := index
	coefficient = math.Pow((n-1)/(n+1), 2)
	return
}

// Example function demonstrating various language features
func Example() {
	// Create material
	glass := &Material{
		Name:            "Borosilicate Glass",
		RefractiveIndex: 1.51,
		Transmittance:   0.95,
		Type:            TypeGlass,
		Quality:         QualityHigh,
		MaxProcessingFPS: 60,
	}

	// Create renderer
	renderer := NewGlassRenderer(glass)

	// Render with error handling
	if err := renderer.Render(); err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	// Compute caustics with generic function
	caustic32 := ComputeCaustics(0.75, glass)
	fmt.Printf("Caustic (float32): %v\n", caustic32)

	// Process rays with goroutines
	rayTracer := NewRayTracer(16)
	results := rayTracer.ProcessRays(8)
	fmt.Printf("Processed %d rays\n", len(results))

	// Compute Fresnel coefficient
	if coeff, err := ComputeFresnelCoefficient(glass.RefractiveIndex); err == nil {
		fmt.Printf("Fresnel coefficient: %.4f\n", coeff)
	}

	// String interpolation with Sprintf
	status := fmt.Sprintf("Renderer ready: %s (n=%.2f)", glass.Name, glass.RefractiveIndex)
	fmt.Println(status)
}
