import { useEffect, useRef, useState } from 'react';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../../config';
import Modal from '../Modal/Modal';
import modalStyles from '../Modal/Modal.module.css';
import styles from './ContactModal.module.css';

// Shown from the main menu and from the in-game gear drawer. The address is
// always readable and selectable, so it still works if the clipboard or a mail
// client isn't available.
export default function ContactModal({ onClose }) {
  const [copied, setCopied] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied('ok');
    } catch {
      // Blocked on insecure origins or by permissions; the address above is
      // still there to select by hand.
      setCopied('failed');
    }
    timer.current = setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Modal
      titleId="contact-title"
      title="Send feedback"
      subtitle="Bugs, balance gripes, and ideas are all welcome."
      onEscape={onClose}
      focusKey="contact"
    >
      <p className={styles.address}>{CONTACT_EMAIL}</p>

      <div className={modalStyles.actions}>
        <button className={modalStyles.secondary} onClick={onClose}>
          Close
        </button>
        <button className={modalStyles.secondary} onClick={copy}>
          {copied === 'ok' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Copy'}
        </button>
        <a className={`${modalStyles.primary} ${styles.mailLink}`} href={CONTACT_MAILTO}>
          Email me
        </a>
      </div>
    </Modal>
  );
}
