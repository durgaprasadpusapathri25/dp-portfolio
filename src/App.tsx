import { useEffect, useState } from 'react'
import {
  motion,
  AnimatePresence,
  useReducedMotion
} from 'motion/react'
import StartProjectForm from './StartProjectForm'
import { supabase } from './supabase'
import './App.css'

const services = [
  {
    number: '01',
    title: 'Website Design & Development',
    description:
      'Modern, responsive websites crafted with thoughtful design, smooth interactions, and a memorable user experience.'
  },
  {
    number: '02',
    title: 'Graphic Design & Branding',
    description:
      'Creative visuals, social media designs, posters, and brand identities that communicate your ideas beautifully.'
  },
  {
    number: '03',
    title: 'Video Editing & Motion Graphics',
    description:
      'Engaging video edits, cinematic storytelling, and motion graphics designed to bring your content to life.'
  },
  {
    number: '04',
    title: 'Creative Digital Experiences',
    description:
      'A combination of creativity and technology to build unique digital experiences for brands and individuals.'
  }
]

const navigation = [
  { label: 'Home', href: '#home' },
  { label: 'Work', href: '#work' },
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' }
]

const contactDetails = {
  email: 'durgaprasadpusapathri25@gmail.com',
  whatsapp: '919640233533',
  instagram: 'prasadpusapatri'
}

const clientMessage =
  "Hi Durga Prasad! 👋\n\nI visited your portfolio website and I'm interested in your creative services. I'd like to discuss a project with you. Could you please share more details?"

const whatsappLink =
  `https://wa.me/${contactDetails.whatsapp}?text=${encodeURIComponent(clientMessage)}`

type PortfolioProject = {
  id: string
  number: string
  title: string
  category: string
  media_url: string
  media_type: 'image' | 'video'
  alt_text: string | null
  description: string | null
  tags: string[]
  project_url: string | null
  sort_order: number
}


function App() {
  const reduceMotion = useReducedMotion()

  const [projects, setProjects] = useState<PortfolioProject[]>([])
  const [portfolioLoading, setPortfolioLoading] = useState(true)
  const [portfolioError, setPortfolioError] = useState('')
  const [selectedProject, setSelectedProject] =
    useState<PortfolioProject | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadPortfolioProjects = async () => {
      setPortfolioLoading(true)
      setPortfolioError('')

      const { data, error } = await supabase
        .from('portfolio_items')
        .select(
          'id, title, category, media_url, media_type, alt_text, description, tags, project_url, sort_order'
        )
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        setPortfolioError('Portfolio projects could not be loaded right now.')
        setPortfolioLoading(false)
        return
      }

      const items = (data ?? []) as Omit<PortfolioProject, 'number'>[]
      setProjects(
        items.map((item, index) => ({
          ...item,
          number: String(index + 1).padStart(2, '0'),
          tags: Array.isArray(item.tags) ? item.tags : []
        }))
      )
      setPortfolioLoading(false)
    }

    void loadPortfolioProjects()

    return () => {
      cancelled = true
    }
  }, [])

  const openPortfolioProject = (project: PortfolioProject) => {
    if (project.project_url) {
      try {
        const url = new URL(project.project_url)
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          window.open(url.href, '_blank', 'noopener,noreferrer')
          return
        }
      } catch {
        // If the saved URL is invalid, show the project preview instead.
      }
    }

    setSelectedProject(project)
  }

  // STEP 79 — MOBILE MENU STATE
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false)

  useEffect(() => {
    if (!selectedProject) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedProject(null)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [selectedProject])

  // CLOSE MOBILE MENU WITH ESCAPE
  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [mobileMenuOpen])

  const reveal = (delay: number, distance = 30) => ({
    initial: {
      opacity: reduceMotion ? 1 : 0,
      y: reduceMotion ? 0 : distance
    },
    animate: {
      opacity: 1,
      y: 0
    },
    transition: {
      duration: reduceMotion ? 0 : 0.9,
      delay: reduceMotion ? 0 : delay,
      ease: [0.22, 1, 0.36, 1] as const
    }
  })

  const scrollReveal = {
    initial: {
      opacity: reduceMotion ? 1 : 0,
      y: reduceMotion ? 0 : 65,
      filter: reduceMotion ? 'none' : 'blur(8px)'
    },
    whileInView: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)'
    },
    viewport: {
      once: true,
      amount: 0.25 as const
    },
    transition: {
      duration: reduceMotion ? 0 : 1,
      ease: [0.22, 1, 0.36, 1] as const
    }
  }

  const contactCards = [
    {
      number: '01',
      title: 'Email Me',
      description: 'Have a project in mind? Send me an email.',
      value: contactDetails.email,
      href: `mailto:${contactDetails.email}`,
      action: 'Send Email ↗'
    },
    {
      number: '02',
      title: 'WhatsApp',
      description: "Let's discuss your ideas directly.",
      value: '+91 9640233533',
      href: whatsappLink,
      action: 'Chat on WhatsApp ↗'
    },
    {
      number: '03',
      title: 'Instagram',
      description: 'Follow my creative journey and connect.',
      value: `@${contactDetails.instagram}`,
      href: `https://www.instagram.com/${contactDetails.instagram}/`,
      action: 'Visit Instagram ↗'
    }
  ]

  return (
    <main className="portfolio">

      {/* STEP 79 — RESPONSIVE NAVIGATION */}
      <motion.nav
        className="navbar"
        aria-label="Main navigation"
        initial={{
          opacity: reduceMotion ? 1 : 0,
          y: reduceMotion ? 0 : -25
        }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0 : 0.8,
          ease: 'easeOut'
        }}
      >
        <a
          className="brand"
          href="#home"
          onClick={() => setMobileMenuOpen(false)}
        >
          <img
            src="/dp-logo.png"
            alt="Durga Prasad — Freelance Digital Creator"
            className="brand-logo"
          />
        </a>

        <div
          id="mobile-navigation"
          className={
            mobileMenuOpen
              ? 'nav-menu mobile-menu-open'
              : 'nav-menu'
          }
        >
          {navigation.map((item) => (
            <a
              href={item.href}
              key={item.href}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>

        <a className="nav-link" href="#contact">
          Let's Connect ↗
        </a>

        <button
          type="button"
          className="mobile-menu-button"
          aria-label={
            mobileMenuOpen
              ? 'Close navigation menu'
              : 'Open navigation menu'
          }
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() =>
            setMobileMenuOpen((previous) => !previous)
          }
        >
          {mobileMenuOpen ? '×' : '☰'}
        </button>
      </motion.nav>

      {/* HERO SECTION */}
      <section className="hero-section" id="home">
        <motion.p className="eyebrow" {...reveal(0.15)}>
          WELCOME TO MY DIGITAL WORLD
        </motion.p>

        <motion.h1
          initial={{
            opacity: reduceMotion ? 1 : 0,
            y: reduceMotion ? 0 : 70,
            filter: reduceMotion ? 'none' : 'blur(12px)'
          }}
          animate={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)'
          }}
          transition={{
            duration: reduceMotion ? 0 : 1.2,
            delay: reduceMotion ? 0 : 0.3,
            ease: [0.22, 1, 0.36, 1]
          }}
        >
          I Turn Creative Ideas
          <br />
          Into <span>Digital Experiences.</span>
        </motion.h1>

        <motion.p
          className="hero-description"
          {...reveal(0.65, 35)}
        >
          I'm Durga Prasad, a freelance digital creator crafting
          modern websites, striking visuals, engaging videos,
          and memorable digital experiences.
        </motion.p>

        <motion.div
          className="hero-actions"
          {...reveal(0.85, 30)}
        >
          <a href="#work" className="primary-button">
            Explore My Work ↗
          </a>

          <a href="#contact" className="secondary-button">
            Let's Work Together
          </a>
        </motion.div>

        <motion.p
          className="hero-signature"
          {...reveal(1.1, 20)}
        >
          DURGA PRASAD{' '}
          <span>— FREELANCE DIGITAL CREATOR</span>
        </motion.p>

        <motion.a
          href="#work"
          className="scroll-indicator"
          aria-label="Scroll to explore my work"
          {...reveal(1.4, 15)}
        >
          <span>SCROLL TO EXPLORE</span>
          <span className="scroll-arrow" aria-hidden="true">
            ↓
          </span>
        </motion.a>
      </section>

      {/* SELECTED WORKS */}
      <section className="preview-section" id="work">
        <motion.div className="work-intro" {...scrollReveal}>
          <p className="eyebrow">MY CREATIVE SPACE</p>

          <h2>
            Selected <span>Works.</span>
          </h2>

          <p className="work-description">
            A collection of digital experiences, creative
            visuals, and meaningful projects. Every creation
            has a story.
          </p>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '28px',
            width: '100%',
            maxWidth: '1120px',
            margin: '48px auto 0',
            boxSizing: 'border-box'
          }}
        >
          {portfolioLoading ? (
            <p style={{ color: '#aaa49a', gridColumn: '1 / -1' }}>
              Loading selected work...
            </p>
          ) : portfolioError ? (
            <p style={{ color: '#e4c78f', gridColumn: '1 / -1' }}>
              {portfolioError}
            </p>
          ) : projects.length === 0 ? (
            <p style={{ color: '#aaa49a', gridColumn: '1 / -1' }}>
              New work is being prepared. Please check back soon.
            </p>
          ) : projects.map((project, index) => (
            <motion.article
              key={project.id}
              initial={{
                opacity: reduceMotion ? 1 : 0,
                y: reduceMotion ? 0 : 55
              }}
              whileInView={{
                opacity: 1,
                y: 0
              }}
              viewport={{
                once: true,
                amount: 0.15
              }}
              whileHover={
                reduceMotion ? undefined : { y: -7 }
              }
              transition={{
                duration: reduceMotion ? 0 : 0.8,
                delay: reduceMotion ? 0 : index * 0.15,
                ease: [0.22, 1, 0.36, 1]
              }}
              style={{
                minWidth: 0,
                padding: '16px',
                boxSizing: 'border-box',
                border:
                  '1px solid rgba(214, 173, 96, 0.3)',
                borderRadius: '18px',
                background:
                  'linear-gradient(145deg, #1a1712, #100f0d)',
                boxShadow:
                  '0 20px 55px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer'
              }}
              onClick={() => openPortfolioProject(project)}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' ||
                  event.key === ' '
                ) {
                  event.preventDefault()
                  openPortfolioProject(project)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`View ${project.title} project`}
            >
              <div
                style={{
                  width: '100%',
                  height: '340px',
                  background: '#0d0c0b',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {project.media_type === 'video' ? (
                  <video
                    src={project.media_url}
                    aria-label={project.alt_text || project.title}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <img
                    src={project.media_url}
                    alt={project.alt_text || project.title}
                    loading="lazy"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  padding: '24px 8px 10px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  flexGrow: 1
                }}
              >
                <span
                  style={{
                    color: '#c6a36a',
                    fontSize: '11px',
                    letterSpacing: '2px',
                    marginBottom: '12px'
                  }}
                >
                  PROJECT {project.number} / {project.category}
                </span>

                <h3
                  style={{
                    color: '#f7f2e8',
                    fontSize: 'clamp(22px, 3vw, 28px)',
                    margin: '0 0 12px'
                  }}
                >
                  {project.title}
                </h3>

                <p
                  style={{
                    color: '#aaa49a',
                    lineHeight: 1.8,
                    margin: 0,
                    fontSize: '14px'
                  }}
                >
                  {project.description || ''}
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '9px',
                    marginTop: 'auto',
                    paddingTop: '22px'
                  }}
                >
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        border:
                          '1px solid rgba(214, 173, 96, 0.25)',
                        borderRadius: '30px',
                        padding: '7px 11px',
                        color: '#d8b778',
                        fontSize: '11px'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <span
                  style={{
                    color: '#e4c78f',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginTop: '22px'
                  }}
                >
                  View Project ↗
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="services-section" id="services">
        <motion.div
          className="services-heading"
          {...scrollReveal}
        >
          <p className="eyebrow">WHAT I CREATE</p>

          <h2>
            Creative <span>Services.</span>
          </h2>

          <p className="services-description">
            From the first idea to the final experience,
            I bring creativity and digital craftsmanship together.
          </p>
        </motion.div>

        <div className="services-grid">
          {services.map((service, index) => (
            <motion.article
              className="service-card"
              key={service.number}
              initial={{
                opacity: reduceMotion ? 1 : 0,
                y: reduceMotion ? 0 : 50
              }}
              whileInView={{
                opacity: 1,
                y: 0
              }}
              viewport={{
                once: true,
                amount: 0.2
              }}
              transition={{
                duration: reduceMotion ? 0 : 0.8,
                delay: reduceMotion ? 0 : index * 0.12,
                ease: [0.22, 1, 0.36, 1]
              }}
            >
              <span className="service-number">
                {service.number} / 04
              </span>

              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section className="about-section" id="about">
        <div className="about-container">
          <motion.div
            className="about-visual"
            {...scrollReveal}
            style={{
              padding: '0',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border:
                '1px solid rgba(214, 173, 96, 0.3)',
              borderRadius: '12px'
            }}
          >
            <img
              src="/dp-portrait.png"
              alt="Durga Prasad — Freelance Digital Creator"
              className="about-portrait"
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                minHeight: '440px',
                maxHeight: '520px',
                objectFit: 'cover',
                objectPosition: 'center 10%',
                border: 'none',
                borderRadius: '0',
                boxShadow: 'none'
              }}
            />

            <span
              className="about-visual-label"
              style={{
                position: 'absolute',
                bottom: '18px',
                left: '20px',
                zIndex: 2,
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.55)',
                borderRadius: '4px'
              }}
            >
              Creativity × Technology
            </span>
          </motion.div>

          <motion.div
            className="about-content"
            {...scrollReveal}
          >
            <p className="eyebrow">
              THE PERSON BEHIND THE WORK
            </p>

            <h2>
              Hi, I'm <span>Durga Prasad.</span>
            </h2>

            <p>
              I'm a freelance digital creator passionate about
              bringing creative ideas to life through design,
              technology, and visual storytelling.
            </p>

            <p>
              Whether it's a modern website, a striking visual,
              or an engaging video, my approach is simple:
              create work that feels meaningful, thoughtful,
              and memorable.
            </p>

            <p>
              I believe great digital experiences come from
              combining imagination, attention to detail,
              and a willingness to keep learning.
            </p>

            <div className="about-signature">
              Durga Prasad — Digital Creator
            </div>
          </motion.div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="contact-section" id="contact">
        <motion.div
          {...scrollReveal}
          style={{
            width: '100%',
            maxWidth: '1120px',
            margin: '0 auto',
            textAlign: 'center'
          }}
        >
          <p className="eyebrow">LET'S CONNECT</p>

          <h2>
            Let's Create <span>Something Great.</span>
          </h2>

          <p
            style={{
              maxWidth: '600px',
              margin: '22px auto 0',
              lineHeight: 1.8
            }}
          >
            Have a creative idea, a project in mind, or simply
            want to say hello? I'd love to hear from you.
            Let's turn your vision into something memorable.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '20px',
              marginTop: '52px',
              width: '100%'
            }}
          >
            {contactCards.map((contact, index) => (
              <motion.a
                key={contact.number}
                href={contact.href}
                target={
                  contact.title === 'Email Me'
                    ? undefined
                    : '_blank'
                }
                rel={
                  contact.title === 'Email Me'
                    ? undefined
                    : 'noopener noreferrer'
                }
                initial={{
                  opacity: reduceMotion ? 1 : 0,
                  y: reduceMotion ? 0 : 35
                }}
                whileInView={{
                  opacity: 1,
                  y: 0
                }}
                viewport={{ once: true }}
                whileHover={
                  reduceMotion
                    ? undefined
                    : { y: -6 }
                }
                transition={{
                  duration: reduceMotion ? 0 : 0.8,
                  delay: reduceMotion ? 0 : index * 0.12
                }}
                style={{
                  flex: '1 1 260px',
                  maxWidth: '460px',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  padding: '32px 25px',
                  border:
                    '1px solid rgba(214, 173, 96, 0.28)',
                  borderRadius: '14px',
                  background:
                    'linear-gradient(145deg, #1a1712, #100f0d)',
                  textDecoration: 'none',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px',
                  boxShadow:
                    '0 16px 45px rgba(0, 0, 0, 0.2)'
                }}
              >
                <span
                  style={{
                    color: '#c6a36a',
                    fontSize: '12px',
                    letterSpacing: '3px'
                  }}
                >
                  {contact.number} / CONNECT
                </span>

                <h3
                  style={{
                    color: '#f7f2e8',
                    fontSize: '24px',
                    margin: 0
                  }}
                >
                  {contact.title}
                </h3>

                <p
                  style={{
                    color: '#aaa49a',
                    lineHeight: 1.7,
                    margin: 0
                  }}
                >
                  {contact.description}
                </p>

                <span
                  style={{
                    color: '#e9dfce',
                    fontSize: '14px',
                    overflowWrap: 'anywhere'
                  }}
                >
                  {contact.value}
                </span>

                <span
                  style={{
                    color: '#d8b778',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginTop: '10px'
                  }}
                >
                  {contact.action}
                </span>
              </motion.a>
            ))}
          </div>

          <StartProjectForm />

          <p
            style={{
              marginTop: '24px',
              color: '#8e887e',
              fontSize: '13px'
            }}
          >
            Available for freelance collaborations.
          </p>
        </motion.div>
      </section>

      <footer>
        <p>
          © {new Date().getFullYear()} Durga Prasad.
        </p>
        <p>Designed with purpose. Built with passion.</p>
      </footer>

      {/* PREMIUM FULL-SCREEN PROJECT PREVIEW */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            key="project-preview"
            role="presentation"
            onClick={() => setSelectedProject(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.25
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.94)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '18px',
              boxSizing: 'border-box'
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`${selectedProject.title} project preview`}
              onClick={(event) => event.stopPropagation()}
              initial={{
                opacity: 0,
                scale: reduceMotion ? 1 : 0.94,
                y: reduceMotion ? 0 : 30
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                scale: reduceMotion ? 1 : 0.96,
                y: reduceMotion ? 0 : 20
              }}
              transition={{
                duration: reduceMotion ? 0 : 0.35,
                ease: [0.22, 1, 0.36, 1]
              }}
              style={{
                width: '100%',
                maxWidth: '1050px',
                maxHeight: '92vh',
                overflowY: 'auto',
                position: 'relative',
                boxSizing: 'border-box',
                border:
                  '1px solid rgba(214, 173, 96, 0.45)',
                borderRadius: '18px',
                background:
                  'linear-gradient(145deg, #1c1915, #0e0d0b)',
                boxShadow:
                  '0 30px 100px rgba(0, 0, 0, 0.7)',
                padding: '24px'
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                aria-label="Close project preview"
                style={{
                  position: 'sticky',
                  top: 0,
                  float: 'right',
                  zIndex: 10,
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border:
                    '1px solid rgba(214, 173, 96, 0.5)',
                  background: '#211c15',
                  color: '#e4c78f',
                  fontSize: '25px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>

              <div
                style={{
                  clear: 'both',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: '#090909',
                  borderRadius: '12px',
                  padding: '14px',
                  boxSizing: 'border-box'
                }}
              >
                {selectedProject.media_type === 'video' ? (
                  <video
                    src={selectedProject.media_url}
                    aria-label={selectedProject.alt_text || selectedProject.title}
                    controls
                    autoPlay
                    playsInline
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: '60vh',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <img
                    src={selectedProject.media_url}
                    alt={selectedProject.alt_text || selectedProject.title}
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: '60vh',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  padding: '24px 4px 4px',
                  textAlign: 'left'
                }}
              >
                <span
                  style={{
                    color: '#c6a36a',
                    fontSize: '12px',
                    letterSpacing: '2px'
                  }}
                >
                  PROJECT {selectedProject.number} /{' '}
                  {selectedProject.category}
                </span>

                <h2
                  style={{
                    color: '#f7f2e8',
                    fontSize: 'clamp(24px, 4vw, 36px)',
                    margin: '12px 0'
                  }}
                >
                  {selectedProject.title}
                </h2>

                <p
                  style={{
                    color: '#aaa49a',
                    fontSize: '15px',
                    lineHeight: 1.8,
                    maxWidth: '800px'
                  }}
                >
                  {selectedProject.description || ''}
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginTop: '20px'
                  }}
                >
                  {selectedProject.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        border:
                          '1px solid rgba(214, 173, 96, 0.3)',
                        borderRadius: '30px',
                        padding: '8px 13px',
                        color: '#d8b778',
                        fontSize: '12px'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {selectedProject.project_url && (
                  <a
                    href={selectedProject.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      marginTop: '24px',
                      padding: '12px 18px',
                      borderRadius: '8px',
                      background: '#d6ad60',
                      color: '#15120d',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    Open Live Website ↗
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

export default App