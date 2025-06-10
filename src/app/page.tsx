"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const planetsData = [
  { name: "Jupiter", distance: 35, size: 4, speed: 0.002 },
  { name: "Saturn", distance: 45, size: 3.5, speed: 0.0017 },
  { name: "Uranus", distance: 55, size: 3, speed: 0.001 },
  { name: "Neptune", distance: 65, size: 2.5, speed: 0.0010 },
  { name: "Earth", distance: 20, size: 2, speed: 0.01 },
  { name: "Venus", distance: 15, size: 1.5, speed: 0.015 },
  { name: "Mars", distance: 25, size: 1, speed: 0.008 },
  { name: "Mercury", distance: 10, size: 0.89, speed: 0.04 },
];

type PlanetSpeeds = { [key: string]: number };

export default function SolarSystem() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const [planetSpeeds, setPlanetSpeeds] = useState<PlanetSpeeds>(() =>
    planetsData.reduce((acc, planet) => {
      acc[planet.name] = planet.speed;
      return acc;
    }, {} as PlanetSpeeds)
  );

  const planetSpeedsRef = useRef<PlanetSpeeds>({ ...planetSpeeds });
  const [isControlVisible, setIsControlVisible] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(125, 80, 100);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Stars
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
      starVertices.push(
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000,
        (Math.random() - 0.5) * 2000
      );
    }
    starGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starVertices, 3)
    );
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.4,
    });
    scene.add(new THREE.Points(starGeometry, starMaterial));

    // Lights
    scene.add(new THREE.AmbientLight(0x404040));
    const pointLight = new THREE.PointLight(0xffffff, 2, 500);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Sun
    const sunGeometry = new THREE.SphereGeometry(7, 70, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.y = 20;
    scene.add(sun);

    // Orbits
    const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x444444 });
    planetsData.forEach((planet) => {
      const orbitGeometry = new THREE.CircleGeometry(planet.distance, 100);
      const posAttr = orbitGeometry.getAttribute("position");
      const positions = posAttr.array as Float32Array;
      const newPositions = positions.slice(3); // remove center vertex
      const newGeometry = new THREE.BufferGeometry();
      newGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(newPositions, 3)
      );
      const orbit = new THREE.LineLoop(newGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      orbit.position.y = 20;
      scene.add(orbit);
    });

    // Planet colors
    const planetColors: { [key: string]: string } = {
      Mercury: "#cccccc",
      Venus: "#ffcc66",
      Earth: "#3399ff",
      Mars: "#ff5733",
      Jupiter: "#ffcc99",
      Saturn: "#ffe066",
      Uranus: "#66ffff",
      Neptune: "#3399ff",
    };

    const planets: THREE.Mesh[] = [];
    const labels: THREE.Sprite[] = [];

    planetsData.forEach((planet) => {
      const geometry = new THREE.SphereGeometry(planet.size, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: planetColors[planet.name],
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = {
        name: planet.name,
        distance: planet.distance,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: 0.01 + Math.random() * 0.02,
        radius: planet.size,
      };
      scene.add(mesh);
      planets.push(mesh);

      // Labels
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.font = "120px Arial";
      ctx.fillText(planet.name, 20, 90);
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(16, 4, 1);
      scene.add(sprite);
      labels.push(sprite);
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function animate() {
      requestAnimationFrame(animate);

      planets.forEach((mesh, i) => {
        const name = mesh.userData.name;
        const speed = planetSpeedsRef.current[name] || 0;
        mesh.userData.angle += speed;
        const angle = mesh.userData.angle;
        const distance = mesh.userData.distance;

        mesh.position.set(
          distance * Math.cos(angle),
          20 + Math.sin(angle * 0.5) * 0.5,
          distance * Math.sin(angle)
        );
        mesh.rotation.y += mesh.userData.rotationSpeed;

        labels[i].position
          .copy(mesh.position)
          .add(new THREE.Vector3(0, mesh.userData.radius + 3, 0));
        labels[i].visible = false;
      });

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(planets);
      if (intersects.length > 0) {
        const hovered = intersects[0].object;
        const index = planets.indexOf(hovered as THREE.Mesh);
        if (index !== -1) labels[index].visible = true;
      }

      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      if (!mountRef.current || !rendererRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener("resize", handleResize);

    function onMouseMove(event: MouseEvent) {
      if (!mountRef.current) return;
      const bounds = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    }
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onMouseMove);
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  function handleSpeedChange(name: string, newSpeed: string) {
    const parsedSpeed = parseFloat(newSpeed);
    planetSpeedsRef.current[name] = parsedSpeed;
    setPlanetSpeeds((prev) => ({ ...prev, [name]: parsedSpeed }));
  }

  return (
    <div
      className="relative max-w-screen h-full overflow-hidden bg-black flex justify-center items-start"
      style={{ height: "100vh" }}
    >
      <div
        ref={mountRef}
        style={{ width: "100vw", height: "100vh", maxWidth: "200%" }}
      />
      <button
        onClick={() => setIsControlVisible((prev) => !prev)}
        className="absolute top-4 left-4 z-20 p-2 font-serif bg-white text-black rounded hover:bg-gray-900 duration-300 hover:text-white"
      >
        {isControlVisible ? "Hide Controls" : "Show Controls"}
      </button>
      <div
        className={`absolute top-14 left-4 z-10 max-w-xs p-4 rounded-xl font-serif text-white bg-black/50 backdrop-blur-md transition-transform duration-300 ease-in-out ${
          isControlVisible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <h2 className="text-lg font-semibold mb-2 font-serif">
          Planet Speed Control
        </h2>
        {planetsData.map((planet) => (
          <div key={planet.name} className="mb-3">
            <label className="block mb-1 text-sm font-medium font-serif">
              {planet.name}
            </label>
            <input
              type="range"
              min="0"
              max="0.1"
              step="0.001"
              value={planetSpeeds[planet.name] || 0}
              onChange={(e) => handleSpeedChange(planet.name, e.target.value)}
              className="w-full accent-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
