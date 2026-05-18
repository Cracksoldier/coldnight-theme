(function () {
  'use strict'

  const toggle = document.getElementById('nav-toggle')
  const mobileNav = document.getElementById('mobile-nav')
  if (!toggle || !mobileNav) return

  function openNav() {
    toggle.setAttribute('aria-expanded', 'true')
    mobileNav.classList.add('nav--open')
  }

  function closeNav() {
    toggle.setAttribute('aria-expanded', 'false')
    mobileNav.classList.remove('nav--open')
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation()
    const isOpen = toggle.getAttribute('aria-expanded') === 'true'
    isOpen ? closeNav() : openNav()
  })

  document.addEventListener('click', function (e) {
    if (!mobileNav.contains(e.target) && e.target !== toggle) {
      closeNav()
    }
  })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav()
  })
})()
