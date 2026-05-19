;(function () {
  const btn = document.getElementById('back-to-top')
  if (!btn) return

  window.addEventListener('scroll', function () {
    btn.classList.toggle('back-to-top--visible', window.scrollY > window.innerHeight)
  }, { passive: true })

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
})()
