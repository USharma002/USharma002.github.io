---
title: "About"
layout: "about"
url: "/about"
summary: "about"
---

<meta name="viewport" content="width=device-width, initial-scale=1.0">

<section class="about-hero">
<!-- Profile Section -->
<div class="profile-section">
  <img 
    src="/images/about/profile-face.jpg"
    alt="Utkarsh Sharma" 
    class="profile-image">
  <h2 class="profile-name">Utkarsh Sharma</h2>
  <p class="profile-title">MTech @ CSA, <br>IISc Bangalore</p>
  
  <!-- CV Button -->
  <a href="/CV/CV_Utkarsh_Sharma.pdf" class="cv-download-button">
    📄 View CV
  </a>
</div>

  <!-- Bio Section -->
  <div class="bio-section">
    <h3 style="margin-bottom: 0.5rem; font-size: 1.8rem;">About Me</h3>
    <p style="line-height: 1.7; font-size: 1.05rem; margin-bottom: 1rem; color: var(--content, #444);">
      I'm a Master's student at the <strong>Indian Institute of Science</strong>, passionate about <strong>Computer Vision</strong>, <strong>Computer Graphics</strong>, and <strong>Deep Learning</strong>.
    </p>
    <p style="line-height: 1.7; font-size: 1.05rem; color: var(--content, #444);">
      This site is where I share my thoughts, research, and projects. 
    </p>
    <div class="social-links">
      <a href="https://www.linkedin.com/in/utkarsh-sharma-83883a216/" class="social-icon linkedin-icon" aria-label="LinkedIn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
        </svg>
      </a>
      <a href="mailto:utkarshsharma1in100@gmail.com" class="social-icon email-icon" aria-label="Email">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      </a>
    </div>
  </div>
  </div>
</section>

<hr style="margin: 2rem auto; max-width: 900px; border: none; border-top: 1px solid #ddd;">
<!-- --- -->
<section style="max-width: 900px; margin: 0 auto; padding: 0 2rem;">
  <h3 style="margin-bottom: 1.5rem; font-size: 1.8rem;">Projects</h3>
  <p style="margin: -0.5rem 0 2rem 0; color: #666; line-height: 1.6;">
    A small selection of projects spanning rendering, computer graphics, and machine learning.
  </p>
  
  <!-- Futaba Renderer -->
  <div class="project-container" style="display: flex; gap: 2rem; align-items: flex-start; margin-bottom: 2.5rem;">
    <div class="project-img-hover" style="position: relative; width: 200px; height: 150px; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
      <img src="https://github.com/USharma002/futaba-renderer/blob/main/assets/dragon-cbox.png?raw=true" alt="Futaba Renderer Static" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block;">
      <img src="https://github.com/USharma002/futaba-renderer/blob/main/assets/futaba-window.png?raw=true" alt="Futaba Renderer Hover" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s;">
    </div>
    <div>
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Futaba Renderer (WIP)</h4>
      <p style="margin: 0.5rem 0 1rem 0; color: #666; line-height: 1.5;">
        A high-performance physically based renderer written in C++ and CUDA.
        The project focuses on clean architecture, GPU acceleration, and advanced rendering techniques.
      </p>
      <div class="about-project-actions">
        <a href="https://github.com/USharma002/futaba-renderer" class="about-project-action" target="_blank">Project Link</a>
      </div>
    </div>
  </div>

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
        Includes PDF visualization, prototype integrators, and spherical sensor tools.
      </p>
      <div class="about-project-actions">
        <a href="https://github.com/USharma002/py-neural-path-guiding" class="about-project-action" target="_blank">Project Link</a>
      </div>
    </div>
  </div>

  <!-- Signed Distance Field Explorer -->
  <div class="project-container" style="display: flex; gap: 2rem; align-items: flex-start; margin-bottom: 2.5rem;">
    <div class="project-img-hover" style="position: relative; width: 200px; height: 150px; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
      <img src="/images/about/sdf-explorer.png" alt="SDF Explorer Static" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; display: block; background-color: #f0f0f0;">
      <img src="/images/about/sdf-explorer.gif" alt="SDF Explorer Hover" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s;">
    </div>
    <div>
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Signed Distance Field Explorer (WIP)</h4>
      <p style="margin: 0.5rem 0 1rem 0; color: #666; line-height: 1.5;">
        An interactive web-based tool for exploring signed distance fields (SDFs).
        Real-time visualization and manipulation of geometric primitives and operations using ray marching.
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
      <img src="/images/about/volpath.gif" alt="Scalar Field GIF" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s;">
    </div>
    <div>
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Scalar Field Reconstructor</h4>
      <p style="margin: 0.5rem 0 1rem 0; color: #666; line-height: 1.5;">
        A Python application for loading, visualizing, and resampling scalar field point cloud data.
        Supports interpolation, octree-based reconstruction, and neural methods.
      </p>
      <div class="about-project-actions">
        <a href="https://github.com/USharma002/VolPath" class="about-project-action" target="_blank">Project Link</a>
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
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Vision Transformer Experiments</h4>
      <p style="margin: 0.5rem 0 1rem 0; color: #666; line-height: 1.5;">
        Implementation and experiments with Vision Transformers for scene understanding.
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
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Neural Denoiser (Coming Soon)</h4>
      <p style="margin: 0.5rem 0 1rem 0; color: #666; line-height: 1.5;">
        Developing deep learning-based denoising methods for photorealistic path tracing.
        <br><span style="font-style: italic; color: #888;">(Private now, going public soon)</span>
      </p>
    </div>
  </div>
</section>



<style>
/* About Section Styles */
.about-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3rem;
  padding: 3rem 2rem;
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 950px;
  margin: 0 auto;
}

.profile-section {
  flex: 0 0 220px;
  text-align: center;
}

.profile-image {
  width: 180px;
  height: 180px;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  margin: 0 auto;
  border: 4px solid var(--theme, #fff);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.profile-image:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 28px rgba(0,0,0,0.18);
}

.profile-name {
  margin-top: 1.2rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.profile-title {
  font-size: 0.95rem;
  color: var(--content, #666);
  margin-bottom: 1rem;
  opacity: 0.8;
}

.bio-section {
  flex: 1;
  min-width: 280px;
}

.social-links {
  display: flex;
  gap: 1rem;
  margin-top: 1.8rem;
}

.social-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: white;
  text-decoration: none;
  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease;
}

.social-icon:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
  color: white;
  text-decoration: none;
}

.linkedin-icon { background-color: #0A66C2; }
.email-icon { background-color: #EA4335; }

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
