import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function GradientActionCard({ title, description, href, icon: Icon, gradient }: { title: string; description: string; href: string; icon: LucideIcon; gradient: string }) {
  return (
    <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
      <Link to={href} className={`${gradient} relative block overflow-hidden rounded-[1.75rem] p-5 text-white shadow-glow ring-1 ring-slate-900/10`}>
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/20 blur-sm" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-white/88">{description}</p>
          </div>
          <div className="rounded-2xl bg-white/18 p-3 ring-1 ring-white/28 backdrop-blur">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
