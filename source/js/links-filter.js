;(function () {
  'use strict'

  var chips = document.querySelectorAll('.links-filters .filter-chip')
  if (!chips.length) return

  var cards = document.querySelectorAll('.link-card')
  var meta  = document.querySelector('.page-header__meta[data-links-total]')
  var total = meta ? meta.dataset.linksTotal : ''

  // Single entry point for both the chip bar and the per-card tag pills, so the
  // two activation paths cannot drift. An empty value means "all".
  function apply (value) {
    chips.forEach(function (c) {
      var on = c.dataset.filterValue === value
      c.classList.toggle('filter-chip--active', on)
      c.setAttribute('aria-pressed', on ? 'true' : 'false')
    })

    var shown = 0
    cards.forEach(function (card) {
      var show = !value || card.dataset.tags.split('|').indexOf(value) !== -1
      card.hidden = !show
      if (show) shown++
    })

    if (meta) {
      meta.textContent = value
        ? shown + ' of ' + total + ' links'
        : total + ' links'
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { apply(chip.dataset.filterValue) })
  })

  document.addEventListener('click', function (e) {
    var pill = e.target.closest && e.target.closest('.link-card__tag')
    if (pill) apply(pill.dataset.filterValue)
  })
})()
