import {
  AirVent,
  BookOpen,
  Bug,
  Camera,
  Car,
  ChefHat,
  Droplet,
  GraduationCap,
  Hammer,
  Laptop,
  Paintbrush,
  Scissors,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react';
import { getCategoryIcon } from './categoryIcon';

const SERVICE_KEYWORDS = [
  { match: /(electr|wire|wiring|power|socket|switch|panel)/i, icon: Zap },
  { match: /(plumb|pipe|drain|leak|tap|faucet|water|sewage)/i, icon: Droplet },
  { match: /(ac|air condition|cooler|ventilation|cooling)/i, icon: AirVent },
  { match: /(clean|sweep|sanitize|maid|mop|dust)/i, icon: Sparkles },
  { match: /(paint|whitewash|polish|color)/i, icon: Paintbrush },
  { match: /(carpent|wood|furniture|drill)/i, icon: Hammer },
  { match: /(pest|termite|rodent|bug|cockroach)/i, icon: Bug },
  { match: /(tutor|teach|class|study|education)/i, icon: GraduationCap },
  { match: /(hair|salon|barber|beauty|spa)/i, icon: Scissors },
  { match: /(driver|car|auto|vehicle)/i, icon: Car },
  { match: /(pack|move|relocat|shift)/i, icon: Truck },
  { match: /(photo|video|shoot|camera)/i, icon: Camera },
  { match: /(cook|chef|catering|meal)/i, icon: ChefHat },
  { match: /(pc|laptop|computer|software|tech)/i, icon: Laptop },
  { match: /(guard|security|cctv)/i, icon: ShieldCheck },
  { match: /(repair|fix|install|maintain|appliance)/i, icon: Wrench },
];

export function getServiceIcon(serviceName, fallbackCategoryIconName) {
  if (serviceName && typeof serviceName === 'string') {
    for (const rule of SERVICE_KEYWORDS) {
      if (rule.match.test(serviceName)) {
        return rule.icon;
      }
    }
  }

  if (fallbackCategoryIconName) {
    return getCategoryIcon(fallbackCategoryIconName);
  }

  return Wrench;
}
