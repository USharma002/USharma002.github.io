---
title: "About"
layout: "about"
url: "/about"
summary: "about"
---

<meta name="viewport" content="width=device-width, initial-scale=1.0">

<section style="display: flex; flex-wrap: wrap; align-items: flex-start; gap: 2rem; padding: 2rem; font-family: system-ui, sans-serif; max-width: 900px; margin: auto;">
<!-- Profile Section -->
<div style="flex: 0 0 200px; text-align: center;">
  <img 
    src="../../images/about/profile-face.jpg" 
    alt="Utkarsh Sharma" 
    style="width: 160px; height: 160px; object-fit: cover; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin: 0 auto;">
  <h2 style="margin-top: 1rem; font-size: 1.4rem;">Utkarsh Sharma</h2>
  <p style="font-size: 0.95rem; color: #666; margin-bottom: 0.75rem;">MTech @ CSA, <br>IISc Bangalore</p>
  
  <!-- CV Button -->
  <a href="../CV/CV_Utkarsh_Sharma.pdf" class="cv-download-button">
    📄 View CV
  </a>
</div>


  <!-- Bio Section -->
  <div style="flex: 1; min-width: 260px;">
    <h3 style="margin-bottom: 0.5rem;">About Me</h3>
    <p style="line-height: 1.6; font-size: 1rem; margin-bottom: 1rem;">
      I'm a Master's student at the <strong>Indian Institute of Science</strong>, passionate about <strong>Computer Vision</strong>, <strong>Computer Graphics</strong>, and <strong>Deep Learning</strong>.
    </p>
    <p style="line-height: 1.6; font-size: 1rem;">
      This site is where I share my thoughts, research, and projects. 
    </p>
    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
      <a href="https://www.linkedin.com/in/utkarsh-sharma-83883a216/" style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background-color: #0A66C2; color: white; text-decoration: none;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
        </svg>
      </a>
      <a href="mailto:utkarshsharma1in100@gmail.com" style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background-color: #EA4335; color: white; text-decoration: none;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      </a>
      <!-- Add after the email icon in the social links div: -->
    </div>
  
<div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e0e0e0;">
  <h4 style="margin-bottom: 0.5rem; font-size: 1rem;">Gaming 2026</h4>
  <p style="line-height: 1.6; font-size: 0.95rem; color: #666; margin-bottom: 0.45rem;">
    <strong>Favourite Game This Year:</strong>
      Resident Evil Requiem
  </p>
  <p style="line-height: 1.6; font-size: 0.95rem; color: #666; margin-bottom: 0.2rem;">
    <strong>Favourite Last Year:</strong>
    <button id="site-theme-toggle-expedition" type="button" class="favorite-game-toggle favorite-game-toggle--expedition" aria-pressed="false" aria-label="Apply Expedition 33 site theme">
      Expedition 33
    </button>
  </p>
</div>

  </div>
</section>

<hr style="margin: 2rem auto; max-width: 900px; border: none; border-top: 1px solid #ddd;">
<!-- --- -->
<section style="max-width: 900px; margin: 0 auto; padding: 0 2rem;">
  <h3 style="margin-bottom: 1.5rem; font-size: 1.8rem;">Projects</h3>
  
  <!-- Neural Path Guiding -->
  <div class="project-container" style="display: flex; gap: 2rem; align-items: flex-start; margin-bottom: 2.5rem;">
    <div class="project-img-hover" style="position: relative; width: 200px; height: 150px; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
      <img src="https://github.com/USharma002/py-neural-path-guiding/blob/main/assets/app.png?raw=true" alt="Neural Path Guiding Static" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block;">
      <img src="https://github.com/USharma002/py-neural-path-guiding/blob/main/assets/learning_pdf.gif?raw=true" alt="Neural Path Guiding GIF" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s;">
    </div>
    <div>
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Neural Path Guiding (Python)</h4>
      <p style="margin: 0.5rem 0 1rem 0; color: #666; line-height: 1.5;">
        Flexible research framework for experimenting with neural path guiding in Mitsuba 3 using Python.
        Includes GUI for PDF visualization, prototype integrators, and spherical sensor tools.
      </p>
      <div class="about-project-actions">
        <a href="https://github.com/USharma002/py-neural-path-guiding" class="about-project-action" target="_blank">Project Link</a>
      </div>
    </div>
  </div>

  <!-- Signed Distance Field Explorer -->
  <div class="project-container" style="display: flex; gap: 2rem; align-items: flex-start; margin-bottom: 2.5rem;">
    <div class="project-img-hover" style="position: relative; width: 200px; height: 150px; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
      <img src="../../images/about/sdf-explorer.png" alt="SDF Explorer Static" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block; background-color: #f0f0f0;">
      <img src="../../images/about/sdf-explorer.gif" alt="SDF Explorer Hover" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s;">
    </div>
    <div>
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Signed Distance Field Explorer (WIP)</h4>
      <p style="margin: 0.5rem 0 1rem 0; color: #666; line-height: 1.5;">
        An interactive web-based tool for exploring Signed Distance Fields (SDFs). 
        Real-time visualization and manipulation of geometric primitives and operations using Raymarching.
      </p>
      <div class="about-project-actions">
        <a href="https://usharma002.github.io/sdf-explorer/" target="_blank" class="about-project-action">Live Demo</a>
        <a href="https://github.com/USharma002/sdf-explorer" target="_blank" class="about-project-action">GitHub</a>
      </div>
    </div>
  </div>
  
  <!-- Project 2 -->
  <div class="project-container" style="display: flex; gap: 2rem; align-items: flex-start; margin-bottom: 2.5rem;">
    <div class="project-img-hover" style="position: relative; width: 200px; height: 150px; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
      <img src="https://github.com/USharma002/VolPath/raw/main/icons/volpath.png" alt="Scalar Field Static" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block;">
      <img src="../../images/about/volpath.gif" alt="Scalar Field GIF" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s;">
    </div>
    <div>
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Scalar Field Reconstructor</h4>
      <p style="margin: 0.5rem 0 1rem 0; color: #666; line-height: 1.5;">
        A python application to load and visualize the scalar field point cloud data and resample it using interpolation, octree or neural network.
      </p>
      <div class="about-project-actions">
        <a href="https://github.com/USharma002/VolPath" class="about-project-action" target="_blank">Project Link</a>
      </div>
    </div>
  </div>

  <!-- Project 3 -->
  <div class="project-container" style="display: flex; gap: 2rem; align-items: flex-start; margin-bottom: 2.5rem;">
    <div class="project-img-hover" style="position: relative; width: 200px; height: 150px; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
      <img src="https://github.com/USharma002/CUDA-PathTracer/blob/main/assets/cbox.png?raw=true" alt="CUDA PathTracer Static" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block;">
      <img src="../../images/about/cuda-pathtracer.gif" alt="CUDA PathTracer GIF" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s;">
    </div>
    <div>
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">CUDA PathTracer</h4>
      <p style="margin: 0.5rem 0 1rem 0; color: #666; line-height: 1.5;">
        Research project for fast GPU-accelerated path tracing with CUDA.
        Includes experiments with custom guiding, radiosity, and interactive visual debugging.
      </p>
      <div class="about-project-actions">
        <a href="https://github.com/USharma002/CUDA-PathTracer" class="about-project-action" target="_blank">Project Link</a>
      </div>
    </div>
  </div>

  
  <!-- VIT Project Placeholder -->
  <div class="project-container" style="display: flex; gap: 2rem; align-items: flex-start; margin-bottom: 2.5rem; opacity: 1;">
    <div class="project-img-hover" style="position: relative; width: 200px; height: 150px; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
      <img src="https://usharma002.github.io/images/transformer/attention_head_output.png" alt="ViT" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block;">
      <img src="https://usharma002.github.io/images/transformer/vit.gif" alt="ViT" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s;">
    </div>
    <div>
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Vision Transformer Project</h4>
      <p style="margin: 0.5rem 0 1rem 0; color: #666; line-height: 1.5;">
        Implementation and experiments with Vision Transformers for efficient scene understanding.
        <!-- <br><span style="font-style: italic; color: #888;">(Private repository, coming soon)</span> -->
      </p>
      <div class="about-project-actions">
        <a href="https://usharma002.github.io/posts/transformer-model/" class="about-project-action">Project Link</a>
      </div>
    </div>
  </div>

  <!-- Neural Denoiser Project Placeholder -->
  <div class="project-container" style="display: flex; gap: 2rem; align-items: flex-start; margin-bottom: 2.5rem; opacity: 0.4;">
    <div class="project-img-hover" style="position: relative; width: 200px; height: 150px; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
      <img src="https://gpuopen.com/images/neural_supersampling_and_denoising_for_real-time_path_tracing-html-_images-Picture3.DkEknTxE.jpg" alt="Denoiser Static" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block;">
      <img src="https://gpuopen.com/images/neural_supersampling_and_denoising_for_real-time_path_tracing-html-_images-Picture3.DkEknTxE.jpg" alt="Denoiser GIF" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s;">
    </div>
    <div>
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Neural Denoiser</h4>
      <p style="margin: 0.5rem 0 1rem 0; color: #666; line-height: 1.5;">
        Developing deep learning-based denoising methods for photorealistic path tracing.
        <br><span style="font-style: italic; color: #888;">(Private repository, coming soon)</span>
      </p>
    </div>
  </div>
</section>



<style>
.project-container {
  display: flex !important;
  gap: 2.25rem !important;
  align-items: stretch !important;
  margin-bottom: 2.8rem !important;
}

.project-container > div:last-child {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.project-container h4 {
  margin: 0 0 0.6rem 0 !important;
  line-height: 1.25;
}

.project-container p {
  margin: 0.4rem 0 1rem 0 !important;
}

.project-img-hover:hover img:first-child {
  opacity: 0 !important;
}
.project-img-hover:hover img:last-child {
  opacity: 1 !important;
}
.project-img-hover img:last-child {
  pointer-events: none;
}
.project-img-hover img {
  transition: opacity 0.3s;
}

/* Tablet and larger (keep desktop layout) */
@media (min-width: 769px) {
  .project-container {
    display: flex !important;
    flex-direction: row !important;
    gap: 2.25rem !important;
    align-items: stretch !important;
  }
  .project-img-hover {
    width: 320px !important;
    height: 200px !important;
  }
}

/* Mobile devices (switch to vertical layout) */
@media (max-width: 768px) {
  section {
    padding: 0 1rem !important;
  }
  
  .project-container {
    display: flex !important;
    flex-direction: column !important;
    gap: 1.1rem !important;
    margin-bottom: 2rem !important;
  }
  
  .project-img-hover {
    width: 100% !important;
    max-width: 320px !important;
    height: 200px !important;
    margin: 0 auto !important;
  }
  
  h3 {
    font-size: 1.3rem !important;
  }
  
  h4 {
    font-size: 0.95rem !important;
  }
  
  p {
    font-size: 0.9rem !important;
  }
}

/* Small phones */
@media (max-width: 480px) {
  section {
    padding: 0 0.75rem !important;
  }
  
  .project-container {
    flex-direction: column !important;
    gap: 0.8rem !important;
  }
  
  .project-img-hover {
    width: 100% !important;
    max-width: 280px !important;
    height: 176px !important;
  }
  
  h3 {
    font-size: 1.1rem !important;
  }
  
  h4 {
    font-size: 0.9rem !important;
  }
  
  p {
    font-size: 0.85rem !important;
  }
}
</style>
