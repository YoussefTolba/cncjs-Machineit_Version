import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import * as THREE from 'three';

import styles from './index.styl';

class MeshVisualizer extends PureComponent {
  static propTypes = {
    points: PropTypes.arrayOf(PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      z: PropTypes.number.isRequired
    })).isRequired
  };

  container = null;

  renderer = null;

  scene = null;

  camera = null;

  meshGroup = null;

  frameId = null;

  isDragging = false;

  lastMouse = { x: 0, y: 0 };

  rotation = { x: -0.75, y: 0.75 };

  distance = 125;

  webglError = null;

  state = {
    unsupported: false
  };

  componentDidMount() {
    this.initScene();
    this.drawMesh();
    window.addEventListener('resize', this.handleResize);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.points !== this.props.points) {
      this.drawMesh();
    }
    this.handleResize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    this.removeCanvasEvents();
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.meshGroup = null;
  }

  setContainerRef = (node) => {
    this.container = node;
  };

  initScene() {
    if (!this.container || this.renderer) {
      return;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf9f9f9);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (err) {
      this.webglError = err;
      this.setState({ unsupported: true });
      return;
    }
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.container.appendChild(this.renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 0.85);
    light.position.set(80, 80, 160);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    this.meshGroup = new THREE.Group();
    this.scene.add(this.meshGroup);

    this.addCanvasEvents();
    this.handleResize();
    this.animate();
  }

  addCanvasEvents() {
    if (!this.renderer || !this.renderer.domElement) {
      return;
    }
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('wheel', this.handleWheel);
  }

  removeCanvasEvents() {
    if (!this.renderer || !this.renderer.domElement) {
      return;
    }
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', this.handleMouseDown);
    canvas.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  handleResize = () => {
    if (!this.container || !this.renderer || !this.camera) {
      return;
    }
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  handleMouseDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.lastMouse = { x: event.clientX, y: event.clientY };
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  };

  handleMouseMove = (event) => {
    if (!this.isDragging) {
      return;
    }
    event.preventDefault();
    const dx = event.clientX - this.lastMouse.x;
    const dy = event.clientY - this.lastMouse.y;
    this.rotation.y += dx * 0.01;
    this.rotation.x += dy * 0.01;
    this.rotation.x = Math.max(-1.35, Math.min(0.15, this.rotation.x));
    this.lastMouse = { x: event.clientX, y: event.clientY };
  };

  handleMouseUp = () => {
    this.isDragging = false;
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  };

  handleWheel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    this.distance += event.deltaY * 0.08;
    this.distance = Math.max(30, Math.min(600, this.distance));
  };

  clearMeshGroup() {
    if (!this.meshGroup) {
      return;
    }
    while (this.meshGroup.children.length) {
      const child = this.meshGroup.children.pop();
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        child.material.dispose();
      }
    }
  }

  getPointMap(points) {
    const xValues = Array.from(new Set(points.map(point => point.x))).sort((a, b) => a - b);
    const yValues = Array.from(new Set(points.map(point => point.y))).sort((a, b) => a - b);
    const pointMap = {};
    points.forEach(point => {
      pointMap[`${point.x}:${point.y}`] = point;
    });
    return { xValues, yValues, pointMap };
  }

  normalizePoint(point, bounds) {
    const width = Math.max(bounds.maxX - bounds.minX, 1);
    const depth = Math.max(bounds.maxY - bounds.minY, 1);
    const height = Math.max(bounds.maxZ - bounds.minZ, 0.001);
    const scale = 80 / Math.max(width, depth);
    return new THREE.Vector3(
      (point.x - (bounds.minX + width / 2)) * scale,
      (point.z - (bounds.minZ + height / 2)) * scale * 6,
      (point.y - (bounds.minY + depth / 2)) * scale
    );
  }

  drawMesh() {
    this.initScene();
    if (!this.meshGroup) {
      return;
    }
    this.clearMeshGroup();

    const { points } = this.props;
    if (points.length === 0) {
      return;
    }

    const bounds = {
      minX: Math.min(...points.map(point => point.x)),
      maxX: Math.max(...points.map(point => point.x)),
      minY: Math.min(...points.map(point => point.y)),
      maxY: Math.max(...points.map(point => point.y)),
      minZ: Math.min(...points.map(point => point.z)),
      maxZ: Math.max(...points.map(point => point.z))
    };
    const { xValues, yValues, pointMap } = this.getPointMap(points);
    const vertices = [];
    const indices = [];

    yValues.forEach(y => {
      xValues.forEach(x => {
        const point = pointMap[`${x}:${y}`];
        if (!point) {
          return;
        }
        const normalized = this.normalizePoint(point, bounds);
        vertices.push(normalized.x, normalized.y, normalized.z);
      });
    });

    const hasFullGrid = vertices.length / 3 === xValues.length * yValues.length && xValues.length > 1 && yValues.length > 1;
    if (hasFullGrid) {
      for (let y = 0; y < yValues.length - 1; y++) {
        for (let x = 0; x < xValues.length - 1; x++) {
          const a = y * xValues.length + x;
          const b = a + 1;
          const c = a + xValues.length;
          const d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    if (indices.length > 0) {
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const material = new THREE.MeshLambertMaterial({
        color: 0x4f9fd8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88
      });
      this.meshGroup.add(new THREE.Mesh(geometry, material));

      const wire = new THREE.WireframeGeometry(geometry);
      this.meshGroup.add(new THREE.LineSegments(wire, new THREE.LineBasicMaterial({ color: 0x2c5d78 })));
    } else {
      const material = new THREE.PointsMaterial({ color: 0x337ab7, size: 4 });
      this.meshGroup.add(new THREE.Points(geometry, material));
    }

    const axes = new THREE.AxesHelper(48);
    axes.position.y = -18;
    this.meshGroup.add(axes);
  }

  updateCamera() {
    if (!this.camera) {
      return;
    }
    const horizontal = Math.cos(this.rotation.x) * this.distance;
    this.camera.position.set(
      Math.sin(this.rotation.y) * horizontal,
      Math.sin(this.rotation.x) * this.distance,
      Math.cos(this.rotation.y) * horizontal
    );
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
  }

  animate = () => {
    this.frameId = requestAnimationFrame(this.animate);
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  };

  render() {
    if (this.state.unsupported) {
      return <div className={styles.visualizerEmpty}>3D viewer unavailable</div>;
    }
    return <div className={styles.meshCanvas} ref={this.setContainerRef} />;
  }
}

export default MeshVisualizer;
