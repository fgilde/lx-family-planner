import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp, MapPinned } from 'lucide-react';

const POPOVER_HEIGHT = 170;

export default function PlanLocationHelp() {
  const triggerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({
    left: 12,
    top: 64,
    width: 320
  });

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 24);
    const left = Math.min(
      window.innerWidth - width - 12,
      Math.max(12, rect.left + rect.width / 2 - width / 2)
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow >= POPOVER_HEIGHT + 16
        ? rect.bottom + 10
        : Math.max(12, rect.top - POPOVER_HEIGHT - 10);

    setPosition({ left, top, width });
  }, []);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openHelp = () => {
    cancelClose();
    updatePosition();
    setIsOpen(true);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 140);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const reposition = () => updatePosition();
    const closeOnEscape = event => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const closeOutside = event => {
      if (
        !triggerRef.current?.contains(event.target) &&
        !document
          .getElementById('plan-location-help-popover')
          ?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, [isOpen, updatePosition]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="household-help-trigger"
        aria-expanded={isOpen}
        aria-controls="plan-location-help-popover"
        onClick={openHelp}
        onMouseEnter={openHelp}
        onMouseLeave={scheduleClose}
        onFocus={openHelp}
        onBlur={scheduleClose}
      >
        <CircleHelp size={14} />
        <span>Wofür?</span>
      </button>

      {isOpen &&
        createPortal(
          <aside
            id="plan-location-help-popover"
            className="plan-location-help-popover"
            role="tooltip"
            style={position}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <span className="plan-location-help-icon">
              <MapPinned size={20} />
            </span>
            <div>
              <strong>Zwei Zuhause, ein Familienplan</strong>
              <p>
                Praktisch, wenn Oma und Opa kein eigenes Familienkonto haben:
                Termine, Aufgaben, Speiseplan, Mülltermine und Pinnwand werden
                für ihr Zuhause getrennt geführt.
              </p>
              <small>
                Ein- oder ausblenden: Zahnrad → Familieneinstellungen.
              </small>
            </div>
          </aside>,
          document.body
        )}
    </>
  );
}
