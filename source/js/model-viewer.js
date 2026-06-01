(function () {
  'use strict'

  function init () {
    var lib = window.__THREE_VIEWER__
    if (!lib || !lib.THREE) return
    document.querySelectorAll('.model-viewer').forEach(function (el) {
      initViewer(el, lib)
    })
  }

  function initViewer (container, lib) {
    var THREE = lib.THREE
    var src = container.dataset.src
    if (!src) return

    var bg = container.dataset.bg || '#1a1a2e'
    var loading = container.querySelector('.model-viewer__loading')

    var scene = new THREE.Scene()
    scene.background = new THREE.Color(bg)

    var w = container.clientWidth || 600
    var h = container.clientHeight || 400
    var camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 10000)
    camera.position.set(0, 0, 5)

    var renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    var ambLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambLight)
    var dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
    dirLight.position.set(5, 10, 7)
    scene.add(dirLight)
    var fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
    fillLight.position.set(-5, -3, -5)
    scene.add(fillLight)

    var controls = new lib.OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    var initialCamPos = camera.position.clone()
    var initialTarget = controls.target.clone()

    var resetBtn = document.createElement('button')
    resetBtn.className = 'model-viewer__reset'
    resetBtn.textContent = 'Reset view'
    resetBtn.setAttribute('aria-label', 'Reset camera view')
    resetBtn.addEventListener('click', function () {
      camera.position.copy(initialCamPos)
      controls.target.copy(initialTarget)
      controls.update()
    })

    var ext = src.split('?')[0].split('.').pop().toLowerCase()

    function onLoad (object) {
      fitCamera(camera, controls, object, THREE)
      initialCamPos = camera.position.clone()
      initialTarget = controls.target.clone()
      scene.add(object)
      if (loading) loading.remove()
      container.appendChild(resetBtn)
    }

    function onError () {
      if (loading) loading.remove()
      var err = document.createElement('div')
      err.className = 'model-viewer__error'
      err.textContent = 'Failed to load model'
      container.appendChild(err)
    }

    if (ext === 'glb' || ext === 'gltf') {
      var gltfLoader = new lib.GLTFLoader()
      gltfLoader.load(src, function (gltf) { onLoad(gltf.scene) }, undefined, onError)
    } else if (ext === 'stl') {
      var stlLoader = new lib.STLLoader()
      stlLoader.load(src, function (geometry) {
        geometry.computeVertexNormals()
        var mat = new THREE.MeshPhongMaterial({ color: 0x4a80c4, specular: 0x222222, shininess: 60 })
        onLoad(new THREE.Mesh(geometry, mat))
      }, undefined, onError)
    } else {
      onError()
      return
    }

    var raf
    function animate () {
      raf = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () {
        var nw = container.clientWidth
        var nh = container.clientHeight
        if (!nw || !nh) return
        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
        renderer.setSize(nw, nh)
      }).observe(container)
    }
  }

  function fitCamera (camera, controls, object, THREE) {
    var box = new THREE.Box3().setFromObject(object)
    var size = box.getSize(new THREE.Vector3()).length()
    var center = box.getCenter(new THREE.Vector3())
    controls.target.copy(center)
    camera.position.set(center.x, center.y, center.z + size * 1.5)
    camera.near = size / 100
    camera.far = size * 200
    camera.updateProjectionMatrix()
    controls.update()
  }

  // Module script (which loads THREE) appears before this defer script in
  // document order, so __THREE_VIEWER__ is set when we run. Dispatch event
  // serves as a safety net if execution order varies.
  if (window.__THREE_VIEWER__) {
    init()
  } else {
    window.addEventListener('three-viewer-ready', init, { once: true })
  }
})()
