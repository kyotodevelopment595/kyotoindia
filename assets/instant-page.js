/*! instant.page v5.2.0 - (C) 2019-2023 Alexandre Dieulot - https://instant.page/license */
(function() {
  let mouseoverTimer
  let lastTouchTimestamp
  const prefetchedUrls = new Set()
  const prefetcher = document.createElement('link')
  const isSupported = prefetcher.relList && prefetcher.relList.supports && prefetcher.relList.supports('prefetch')
    && window.IntersectionObserver && 'isIntersecting' in IntersectionObserverEntry.prototype
  const allowQueryString = 'instantAllowQueryString' in document.body.dataset
  const allowExternalLinks = 'instantAllowExternalLinks' in document.body.dataset
  const useWhitelist = 'instantWhitelist' in document.body.dataset
  const mousedownShortcut = 'instantMousedownShortcut' in document.body.dataset
  const DELAY_TO_NOT_BE_CONSIDERED_A_TOUCH_EVENT = 1111

  let delayOnHover = 65
  if ('instantIntensity' in document.body.dataset) {
    const intensity = document.body.dataset.instantIntensity
    if (intensity.substr(0, 'mousedown'.length) == 'mousedown') {
      delayOnHover = 0
    }
    else if (intensity.substr(0, 'viewport'.length) == 'viewport') {
      if (!(navigator.connection && (navigator.connection.saveData || (navigator.connection.effectiveType && navigator.connection.effectiveType.includes('2g'))))) {
        if (intensity == 'viewport') {
          if (document.documentElement.clientWidth * document.documentElement.clientHeight < 450000) {
            delayOnHover = 0
          }
        }
        else if (intensity == 'viewport-all') {
          delayOnHover = 0
        }
      }
    }
    else {
      const parsedIntensity = parseInt(intensity)
      if (!isNaN(parsedIntensity)) {
        delayOnHover = parsedIntensity
      }
    }
  }

  if (!isSupported) {
    return
  }

  const eventListenersOptions = {
    capture: true,
    passive: true,
  }

  if (!mousedownShortcut) {
    document.addEventListener('touchstart', touchstartListener, eventListenersOptions)
  }

  document.addEventListener('mouseover', mouseoverListener, eventListenersOptions)

  if (mousedownShortcut) {
    document.addEventListener('mousedown', mousedownShortcutListener, eventListenersOptions)
  }

  function touchstartListener(event) {
    /* Chrome on Android calls mouseover before touchstart so we need to
     * use this flag to prevent infinite loops. */
    lastTouchTimestamp = performance.now()

    const linkElement = event.target.closest('a')

    if (!isPreloadable(linkElement)) {
      return
    }

    preload(linkElement.href, 'high')
  }

  function mouseoverListener(event) {
    if (performance.now() - lastTouchTimestamp < DELAY_TO_NOT_BE_CONSIDERED_A_TOUCH_EVENT) {
      return
    }

    const linkElement = event.target.closest('a')

    if (!isPreloadable(linkElement)) {
      return
    }

    linkElement.addEventListener('mouseout', mouseoutListener, {passive: true})

    mouseoverTimer = setTimeout(() => {
      preload(linkElement.href, 'high')
      mouseoverTimer = undefined
    }, delayOnHover)
  }

  function mousedownShortcutListener(event) {
    const linkElement = event.target.closest('a')

    if (!isPreloadable(linkElement)) {
      return
    }

    preload(linkElement.href, 'high')
  }

  function mouseoutListener(event) {
    if (event.relatedTarget && event.target.closest('a') == event.relatedTarget.closest('a')) {
      return
    }

    if (mouseoverTimer) {
      clearTimeout(mouseoverTimer)
      mouseoverTimer = undefined
    }
  }

  function mousedownShortcutRefresh() {
    if (mousedownShortcut) {
      document.addEventListener('mousedown', mousedownShortcutListener, eventListenersOptions)
    }
  }

  function isPreloadable(linkElement) {
    if (!linkElement || !linkElement.href) {
      return
    }

    if (useWhitelist && !('instant' in linkElement.dataset)) {
      return
    }

    if (linkElement.origin != location.origin) {
      if (!(allowExternalLinks || 'instant' in linkElement.dataset)) {
        return
      }
    }

    if (!['http:', 'https:'].includes(linkElement.protocol)) {
      return
    }

    if (linkElement.protocol == 'http:' && location.protocol == 'https:') {
      return
    }

    if (!allowQueryString && linkElement.search && !('instant' in linkElement.dataset)) {
      return
    }

    if (linkElement.hash && linkElement.pathname + linkElement.search == location.pathname + location.search) {
      return
    }

    if ('noInstant' in linkElement.dataset) {
      return
    }

    return true
  }

  function preload(url, fetchPriority) {
    if (prefetchedUrls.has(url)) {
      return
    }

    const prefetcher = document.createElement('link')
    prefetcher.rel = 'prefetch'
    prefetcher.href = url
    if (fetchPriority) {
      prefetcher.fetchPriority = fetchPriority
    }
    document.head.appendChild(prefetcher)

    prefetchedUrls.add(url)
  }
})()
