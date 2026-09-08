import { brand } from '@/data/mockData';
import { radius, space, type } from '@/styles/tokens';

export const modStyles = {
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    backgroundColor: '#FDECEA',
    borderRadius: radius.xs,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  badgeText: { ...type.label, color: '#8C2F27', textTransform: 'uppercase' as const },
  date: { ...type.caption },
  reason: { ...type.bodyStrong },
  targetId: { ...type.caption, fontSize: 11 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  action: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 11,
  },
  actionPrimary: { backgroundColor: brand.primary, borderColor: brand.primary },
  actionDestructive: { backgroundColor: '#8C2F27', borderColor: '#8C2F27' },
  actionText: { ...type.bodyStrong },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  memberName: { ...type.bodyStrong },
  memberMeta: { ...type.caption },
  memberActions: { flexDirection: 'row', gap: space.xs },
  iconAction: { padding: space.sm },
} as const;
