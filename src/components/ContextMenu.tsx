"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ContextMenu.module.css';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'danger' | 'default';
  divider?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    // Adjust position if menu goes off screen
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      
      let newX = x;
      let newY = y;
      
      if (x + rect.width > winW) newX = winW - rect.width - 10;
      if (y + rect.height > winH) newY = winH - rect.height - 10;
      
      setPos({ x: newX, y: newY });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScroll = () => onClose();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };

    window.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} onContextMenu={e => e.preventDefault()}>
      <motion.div
        ref={menuRef}
        className={styles.menu}
        style={{ left: pos.x, top: pos.y }}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <button
              className={`${styles.item} ${item.variant === 'danger' ? styles.danger : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                onClose();
              }}
            >
              {item.icon && <span className={styles.icon}>{item.icon}</span>}
              <span className={styles.label}>{item.label}</span>
            </button>
            {item.divider && <div className={styles.divider} />}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}
