import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useLive } from '@/data';
import { areaOf, bookableDates, firstName, offeredDates, shortDay, workedWith, type Response, type Shift } from '@/domain';
import { useTheme } from '@/theme/useTheme';
import { Badge, Button, Photo, Text, Ticket } from '@/ui';

import { daysPhrase } from './format';
import { useMessage } from './useMessage';

/**
 * One person who said yes (spec §6.2 item 8): photo and name (→ their card),
 * positions · area, tags, a clamped bio, Book and Message. Lit while the
 * venue can still book them: the decision is waiting on it.
 */
export function ResponseCard({ s, r }: { s: Shift; r: Response }) {
  const { data } = useLive();
  const t = useTheme();
  const message = useMessage();
  if (!data) return null;
  const person = data.members.find((m) => m.id === r.talent);
  if (!person) return null;
  const n = s.days.length;
  const offered = offeredDates(s, r);
  const bookable = bookableDates(data, s, r);
  const gone = offered.filter((d) => !bookable.includes(d));
  const first = firstName(person);
  const canBook = s.status === 'open' && bookable.length > 0;
  const facts = [person.roles.join(' · '), areaOf(person)].filter(Boolean).join(' · ');

  const dayTag =
    n > 1
      ? `${offered.length === n ? `Can do all ${n} days` : `Can do ${offered.map(shortDay).join(', ')}`}${
          gone.length ? ` (${gone.map(shortDay).join(', ')} filled)` : ''
        }`
      : null;

  return (
    <Ticket lit={canBook} gap={t.space.md}>
      <Pressable
        onPress={() => router.push({ pathname: '/talent/[id]', params: { id: person.id } })}
        accessibilityRole="link"
        accessibilityLabel={`${person.name}, ${facts}`}
        accessibilityHint="Opens their profile"
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: t.space.md, opacity: pressed ? 0.7 : 1 })}>
        <Photo uri={person.photo} name={person.name} width={Math.round(64 * t.scale)} radius={t.radius.md} accessibilityLabel="" />
        <View style={{ flex: 1, minWidth: 0, gap: t.space.xxs }}>
          <Text variant="title3" numberOfLines={2}>
            {person.name}
          </Text>
          {facts ? (
            <Text variant="subhead" color="muted" numberOfLines={2}>
              {facts}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {workedWith(data, s.venue, person.id) || dayTag || person.skills.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.xs }}>
          {workedWith(data, s.venue, person.id) ? <Badge label="Worked with you" tone="good" /> : null}
          {dayTag ? <Badge label={dayTag} tone={offered.length === n ? 'good' : 'neutral'} /> : null}
          {person.skills.slice(0, 3).map((skill) => (
            <Badge key={skill} label={skill} icon={null} />
          ))}
        </View>
      ) : null}

      {person.bio ? (
        <Text variant="subhead" color="muted" numberOfLines={3}>
          {person.bio}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
        <Button
          label={`Book ${first}${n > 1 ? ` · ${daysPhrase(bookable, n)}` : ''}`}
          disabled={!canBook}
          onPress={() => router.push({ pathname: '/sheet/book-confirm', params: { shiftId: s.id, talentId: person.id } })}
        />
        <Button label="Message" variant="secondary" accessibilityLabel={`Message ${first}`} onPress={() => void message(person.id)} />
      </View>
    </Ticket>
  );
}
