'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Ban,
  Briefcase,
  ExternalLink,
  Flag,
  FolderOpen,
  Gavel,
  LayoutGrid,
  LifeBuoy,
  ShieldCheck,
  UsersRound,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';

const ADMIN_NAV = [
  {
    href: '/admin',
    label: 'Overview',
    icon: LayoutGrid,
    exact: true,
  },
  {
    href: '/admin/users',
    label: 'Users & Providers',
    icon: UsersRound,
  },
  {
    href: '/admin/provider-applications',
    label: 'Provider Approvals',
    icon: ShieldCheck,
  },
  {
    href: '/admin/provider-documents',
    label: 'Provider Documents',
    icon: FolderOpen,
  },
  {
    href: '/admin/categories-services',
    label: 'Categories & Services',
    icon: Briefcase,
  },
  {
    href: '/admin/requirements',
    label: 'Requirements',
    icon: Gavel,
  },
  {
    href: '/admin/wallet',
    label: 'Wallet',
    icon: Wallet,
  },
  {
    href: '/admin/cancellations',
    label: 'Cancellations',
    icon: Ban,
  },
  {
    href: '/admin/reports',
    label: 'Reports',
    icon: Flag,
  },
  {
    href: '/admin/support',
    label: 'Support',
    icon: LifeBuoy,
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  const navRef = useRef(null);
  const navItemRefs = useRef({});

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  /*
   * ------------------------------------------------------------
   * ACTIVE NAVIGATION
   * ------------------------------------------------------------
   */
  const isNavActive = (item) => {
    if (item.exact) {
      return pathname === item.href;
    }

    return pathname.startsWith(item.href);
  };

  /*
   * ------------------------------------------------------------
   * UPDATE SCROLL STATE
   * ------------------------------------------------------------
   *
   * This controls:
   *
   * - Left arrow visibility
   * - Right arrow visibility
   * - Pagination dots
   *
   * No padding is added to the scroll container, so there is
   * never any artificial empty space at the beginning/end.
   */
  const updateNavigationState = () => {
    const nav = navRef.current;

    if (!nav) return;

    const scrollLeft = nav.scrollLeft;
    const maxScrollLeft = Math.max(
      0,
      nav.scrollWidth - nav.clientWidth
    );

    const tolerance = 2;

    /*
     * Can move backwards?
     */
    const hasPreviousContent =
      scrollLeft > tolerance;

    /*
     * Can move forwards?
     */
    const hasNextContent =
      scrollLeft < maxScrollLeft - tolerance;

    setCanScrollLeft(hasPreviousContent);
    setCanScrollRight(hasNextContent);

    /*
     * ----------------------------------------------------------
     * PAGINATION
     * ----------------------------------------------------------
     */

    if (maxScrollLeft <= tolerance) {
      setPageCount(1);
      setCurrentPage(0);
      return;
    }

    /*
     * Keep pagination compact.
     *
     * Example:
     *  - small content  -> 2 dots
     *  - larger content -> up to 4 dots
     */
    const calculatedPages = Math.ceil(
      nav.scrollWidth / nav.clientWidth
    );

    const pages = Math.max(
      2,
      Math.min(calculatedPages, 4)
    );

    setPageCount(pages);

    const progress =
      maxScrollLeft > 0
        ? scrollLeft / maxScrollLeft
        : 0;

    const calculatedPage = Math.round(
      progress * (pages - 1)
    );

    setCurrentPage(
      Math.max(
        0,
        Math.min(calculatedPage, pages - 1)
      )
    );
  };

  /*
   * ------------------------------------------------------------
   * INITIALIZE SCROLL LISTENERS
   * ------------------------------------------------------------
   */
  useEffect(() => {
    const nav = navRef.current;

    if (!nav) return;

    /*
     * Initial calculation.
     */
    updateNavigationState();

    /*
     * Update when user manually scrolls.
     */
    const handleScroll = () => {
      updateNavigationState();
    };

    /*
     * Update on window resize.
     */
    const handleResize = () => {
      updateNavigationState();
    };

    nav.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    window.addEventListener('resize', handleResize);

    /*
     * Handles layout changes that don't necessarily trigger
     * window resize.
     */
    const resizeObserver = new ResizeObserver(() => {
      updateNavigationState();
    });

    resizeObserver.observe(nav);

    return () => {
      nav.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * KEEP ACTIVE NAV ITEM VISIBLE
   * ------------------------------------------------------------
   *
   * If user opens something like:
   *
   * /admin/reports
   *
   * and Reports is outside the visible navigation area,
   * automatically bring it into view.
   */
  useEffect(() => {
    const activeItem = ADMIN_NAV.find((item) =>
      isNavActive(item)
    );

    if (!activeItem) return;

    const element =
      navItemRefs.current[activeItem.href];

    if (!element) return;

    /*
     * Small timeout allows the navigation layout to settle
     * before scrolling.
     */
    const timer = setTimeout(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });

      /*
       * Recalculate arrows after active item movement.
       */
      setTimeout(() => {
        updateNavigationState();
      }, 350);
    }, 50);

    return () => clearTimeout(timer);
  }, [pathname]);

  /*
   * ------------------------------------------------------------
   * SCROLL LEFT / RIGHT
   * ------------------------------------------------------------
   */
  const scrollNav = (direction) => {
    const nav = navRef.current;

    if (!nav) return;

    /*
     * Scroll roughly 70% of visible width.
     *
     * This gives a smooth carousel-like movement while
     * preserving enough context from the previous position.
     */
    const scrollAmount = Math.max(
      nav.clientWidth * 0.7,
      280
    );

    nav.scrollBy({
      left:
        direction === 'next'
          ? scrollAmount
          : -scrollAmount,
      behavior: 'smooth',
    });
  };

  /*
   * ------------------------------------------------------------
   * GO TO PAGINATION PAGE
   * ------------------------------------------------------------
   */
  const goToPage = (index) => {
    const nav = navRef.current;

    if (!nav || pageCount <= 1) return;

    const maxScrollLeft =
      nav.scrollWidth - nav.clientWidth;

    if (maxScrollLeft <= 0) return;

    const targetScroll =
      (maxScrollLeft / (pageCount - 1)) * index;

    nav.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen pb-16">
        {/* =====================================================
            ADMIN COMMAND CENTER
        ====================================================== */}

        <div
          className="
            relative
            mb-8
            overflow-hidden
            rounded-[28px]
            border
            border-slate-700/40
            bg-gradient-to-br
            from-[#101a31]
            via-[#0f192f]
            to-[#0a1327]
            text-white
            shadow-[0_20px_55px_rgba(15,23,42,0.18)]
          "
        >
          {/* ===================================================
              AMBIENT GLOW
          ==================================================== */}

          <div
            className="
              pointer-events-none
              absolute
              -left-24
              -top-24
              h-64
              w-64
              rounded-full
              bg-violet-500/10
              blur-3xl
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -right-24
              -top-20
              h-56
              w-56
              rounded-full
              bg-blue-500/5
              blur-3xl
            "
          />

          {/* ===================================================
              HEADER
          ==================================================== */}

          <div
            className="
              relative
              px-5
              py-7
              sm:px-8
              sm:py-8
            "
          >
            <div
              className="
                flex
                flex-col
                gap-6
                lg:flex-row
                lg:items-center
                lg:justify-between
              "
            >
              {/* Brand */}

              <div
                className="
                  flex
                  min-w-0
                  items-center
                  gap-4
                "
              >
                {/* Logo */}

                <div
                  className="
                    flex
                    h-[58px]
                    w-[58px]
                    shrink-0
                    items-center
                    justify-center
                    rounded-[17px]
                    bg-gradient-to-br
                    from-[#f15f78]
                    via-[#e95791]
                    to-[#8b5cf6]
                    shadow-[0_8px_25px_rgba(139,92,246,0.25)]
                  "
                >
                  <ShieldCheck
                    size={30}
                    strokeWidth={2}
                    className="text-white"
                    aria-hidden="true"
                  />
                </div>

                {/* Heading */}

                <div className="min-w-0">
                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      gap-2.5
                    "
                  >
                    <h1
                      className="
                        font-display
                        text-[23px]
                        font-bold
                        tracking-[-0.025em]
                        text-white
                        sm:text-[28px]
                      "
                    >
                      Admin Command Center
                    </h1>

                    {/* Live Status */}

                    <span
                      className="
                        inline-flex
                        items-center
                        rounded-full
                        border
                        border-emerald-400/20
                        bg-emerald-400/10
                        px-3
                        py-1
                        text-[10px]
                        font-semibold
                        tracking-wide
                        text-emerald-300
                        backdrop-blur-sm
                      "
                    >
                      <span
                        className="
                          mr-1.5
                          h-1.5
                          w-1.5
                          rounded-full
                          bg-emerald-400
                          shadow-[0_0_8px_rgba(52,211,153,0.8)]
                        "
                      />

                      Live Operations
                    </span>
                  </div>

                  <p
                    className="
                      mt-1
                      max-w-2xl
                      text-[12px]
                      leading-5
                      text-slate-400
                      sm:text-[13px]
                    "
                  >
                    Platform oversight, user verification,
                    dispute resolution &amp; catalog management
                  </p>
                </div>
              </div>

              {/* Public Site */}

              <Link
                href="/"
                className="
                  group
                  inline-flex
                  shrink-0
                  items-center
                  justify-center
                  gap-2
                  self-start
                  rounded-full
                  border
                  border-white/[0.09]
                  bg-white/[0.045]
                  px-5
                  py-3
                  text-[13px]
                  font-semibold
                  text-slate-100
                  shadow-inner
                  shadow-white/[0.03]
                  backdrop-blur-xl
                  transition-all
                  duration-300
                  hover:border-white/[0.16]
                  hover:bg-white/[0.08]
                  active:scale-[0.98]
                  lg:self-auto
                "
              >
                <span>View Public Site</span>

                <ExternalLink
                  size={16}
                  strokeWidth={2}
                  className="
                    text-slate-300
                    transition-transform
                    duration-300
                    group-hover:-translate-y-0.5
                    group-hover:translate-x-0.5
                  "
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

          {/* ===================================================
              NAVIGATION AREA
          ==================================================== */}

          <div
            className="
              relative
              border-t
              border-white/[0.065]
            "
          >
            {/* =================================================
                SCROLL CONTAINER

                IMPORTANT:
                No px-10
                No mx
                No padding-left
                No padding-right

                Therefore:
                START = 0 extra space
                END   = 0 extra space
            ================================================== */}

            <div
              ref={navRef}
              className="
                flex
                w-full
                overflow-x-auto
                scroll-smooth
                overscroll-x-contain
                touch-pan-x
                [scrollbar-width:none]
                [&::-webkit-scrollbar]:hidden
              "
            >
              {/* =================================================
                  NAV ITEMS

                  No padding here either.
                  This ensures the scrollable content starts
                  exactly at the first item and ends exactly
                  at the last item.
              ================================================== */}

              <div
                className="
                  flex
                  min-w-max
                  items-center
                  gap-1.5
                  py-4
                  pl-3
                  pr-3
                  sm:pl-5
                  sm:pr-5
                "
              >
                {ADMIN_NAV.map((item) => {
                  const active = isNavActive(item);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      ref={(element) => {
                        if (element) {
                          navItemRefs.current[item.href] =
                            element;
                        } else {
                          delete navItemRefs.current[
                            item.href
                          ];
                        }
                      }}
                      className={`
                        group
                        relative
                        flex
                        shrink-0
                        items-center
                        gap-2.5
                        rounded-xl
                        px-4
                        py-3
                        text-[13px]
                        font-medium
                        whitespace-nowrap
                        transition-all
                        duration-300
                        ease-out

                        ${
                          active
                            ? `
                              bg-white/[0.09]
                              text-white
                              shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]
                            `
                            : `
                              text-slate-300
                              hover:bg-white/[0.055]
                              hover:text-white
                            `
                        }
                      `}
                    >
                      <Icon
                        size={18}
                        strokeWidth={1.8}
                        className={`
                          shrink-0
                          transition-all
                          duration-300

                          ${
                            active
                              ? `
                                text-white
                                scale-105
                              `
                              : `
                                text-slate-400
                                group-hover:text-slate-200
                              `
                          }
                        `}
                        aria-hidden="true"
                      />

                      <span>
                        {item.label}
                      </span>

                      {/* Active underline */}

                      <span
                        className={`
                          absolute
                          bottom-0.5
                          left-1/2
                          h-0.5
                          -translate-x-1/2
                          rounded-full
                          bg-gradient-to-r
                          from-violet-400
                          to-purple-400
                          transition-all
                          duration-300

                          ${
                            active
                              ? 'w-5 opacity-100'
                              : 'w-0 opacity-0'
                          }
                        `}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* =================================================
                LEFT ARROW

                IMPORTANT:
                Absolute positioning means it does NOT create
                any additional space inside the scroll area.
            ================================================== */}

            <button
              type="button"
              onClick={() => scrollNav('prev')}
              aria-label="Scroll navigation left"
              aria-hidden={!canScrollLeft}
              tabIndex={canScrollLeft ? 0 : -1}
              className={`
                absolute
                left-3
                top-1/3
                z-30
                flex
                h-12
                w-12
                -translate-y-1/2
                items-center
                justify-center
                rounded-full
                border
                border-white/[0.06]
                bg-slate-700/55
                text-slate-200
                shadow-[0_8px_25px_rgba(0,0,0,0.25)]
                backdrop-blur-xl
                transition-all
                duration-300
                ease-out
                sm:left-5

                ${
                  canScrollLeft
                    ? `
                      pointer-events-auto
                      scale-100
                      opacity-100
                    `
                    : `
                      pointer-events-none
                      scale-90
                      opacity-0
                    `
                }

                hover:bg-slate-600/70
                hover:text-white
                active:scale-95
              `}
            >
              <ChevronLeft
                size={21}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>

            {/* =================================================
                RIGHT ARROW

                Also absolute, so it creates ZERO extra
                scrollable space.
            ================================================== */}

            <button
              type="button"
              onClick={() => scrollNav('next')}
              aria-label="Scroll navigation right"
              aria-hidden={!canScrollRight}
              tabIndex={canScrollRight ? 0 : -1}
              className={`
                absolute
                right-3
                top-1/3
                z-30
                flex
                h-12
                w-12
                -translate-y-1/2
                items-center
                justify-center
                rounded-full
                border
                border-white/[0.06]
                bg-slate-700/55
                text-slate-200
                shadow-[0_8px_25px_rgba(0,0,0,0.25)]
                backdrop-blur-xl
                transition-all
                duration-300
                ease-out
                sm:right-5

                ${
                  canScrollRight
                    ? `
                      pointer-events-auto
                      scale-100
                      opacity-100
                    `
                    : `
                      pointer-events-none
                      scale-90
                      opacity-0
                    `
                }

                hover:bg-slate-600/70
                hover:text-white
                active:scale-95
              `}
            >
              <ChevronRight
                size={21}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>

            {/* =================================================
                PAGINATION
            ================================================== */}

            <div
              className={`
                flex
                items-center
                justify-center
                gap-2
                overflow-hidden
                transition-all
                duration-300

                ${
                  pageCount > 1
                    ? 'max-h-8 pb-4 opacity-100'
                    : 'max-h-0 pb-0 opacity-0'
                }
              `}
            >
              {Array.from({
                length: pageCount,
              }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => goToPage(index)}
                  aria-label={`Go to navigation page ${
                    index + 1
                  }`}
                  aria-current={
                    index === currentPage
                      ? 'true'
                      : undefined
                  }
                  className={`
                    h-2
                    rounded-full
                    transition-all
                    duration-500
                    ease-out

                    ${
                      index === currentPage
                        ? `
                          w-8
                          bg-violet-400
                          shadow-[0_0_14px_rgba(167,139,250,0.5)]
                        `
                        : `
                          w-2
                          bg-slate-600/70
                          hover:bg-slate-500
                        `
                    }
                  `}
                />
              ))}
            </div>
          </div>
        </div>

        {/* =====================================================
            PAGE CONTENT
        ====================================================== */}

        <div
          className="
            transition-all
            duration-300
            ease-out
          "
        >
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}