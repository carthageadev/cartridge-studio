import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useStore } from '../../store'

/** Console power-on splash: logo in, hold, fade to the OS. */
export function BootSplash() {
  const booted = useStore((s) => s.booted)
  const setBooted = useStore((s) => s.setBooted)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || booted) return
    const tl = gsap.timeline({
      onComplete: () => setBooted(true),
    })
    tl.fromTo(
      el.querySelectorAll('.boot-letter'),
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.045, ease: 'power3.out', delay: 0.3 }
    )
      .fromTo(
        el.querySelector('.boot-sub'),
        { opacity: 0 },
        { opacity: 1, duration: 0.4 },
        '-=0.15'
      )
      .fromTo(
        el.querySelector('.boot-bar-fill'),
        { scaleX: 0 },
        { scaleX: 1, duration: 0.9, ease: 'power1.inOut' },
        '-=0.1'
      )
      .to(el, { opacity: 0, duration: 0.55, ease: 'power2.inOut', delay: 0.25 })
    return () => {
      tl.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (booted) return null

  const word = 'RETROFLOW'

  return (
    <div className="boot" ref={ref}>
      <div className="boot-logo">
        {word.split('').map((c, i) => (
          <span className="boot-letter" key={i}>
            {c}
          </span>
        ))}
        <span className="boot-letter boot-64">64</span>
      </div>
      <div className="boot-sub">HANDHELD ENTERTAINMENT SYSTEM</div>
      <div className="boot-bar">
        <div className="boot-bar-fill" />
      </div>
    </div>
  )
}
