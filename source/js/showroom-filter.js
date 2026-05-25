;(function () {
  'use strict'

  var chips = document.querySelectorAll('.showroom-filter-chip')
  if (!chips.length) return

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) {
        c.classList.remove('showroom-filter-chip--active')
        c.setAttribute('aria-pressed', 'false')
      })
      chip.classList.add('showroom-filter-chip--active')
      chip.setAttribute('aria-pressed', 'true')

      var type = chip.dataset.filterType

      document.querySelectorAll('.project-card').forEach(function (card) {
        var isAI = card.dataset.ai === 'true'
        if (type === 'all')        card.hidden = false
        else if (type === 'ai')    card.hidden = !isAI
        else if (type === 'human') card.hidden = isAI
      })
    })
  })
})()
