import type { SFSymbol } from 'expo-symbols';

/**
 * The one icon lookup table. Every icon in the app is named here once and
 * maps to an SF Symbol on iOS and a Material Symbol on Android.
 * Feature code uses the key (`<Icon name="bell" />`), never a platform name.
 */
export const icons = {
  // Tabs
  shifts: { ios: 'list.bullet.rectangle.portrait', iosSelected: 'list.bullet.rectangle.portrait.fill', android: 'receipt_long' },
  book: { ios: 'person.2', iosSelected: 'person.2.fill', android: 'group' },
  bookings: { ios: 'calendar', iosSelected: 'calendar', android: 'calendar_month' },
  availability: { ios: 'calendar.badge.clock', iosSelected: 'calendar.badge.clock', android: 'event_available' },
  post: { ios: 'plus', iosSelected: 'plus', android: 'add' },
  messages: { ios: 'bubble.left.and.bubble.right', iosSelected: 'bubble.left.and.bubble.right.fill', android: 'forum' },
  profile: { ios: 'person.crop.circle', iosSelected: 'person.crop.circle.fill', android: 'account_circle' },

  // Header and navigation
  bell: { ios: 'bell', iosSelected: 'bell.fill', android: 'notifications' },
  back: { ios: 'chevron.left', iosSelected: 'chevron.left', android: 'arrow_back' },
  forward: { ios: 'chevron.right', iosSelected: 'chevron.right', android: 'chevron_right' },
  close: { ios: 'xmark', iosSelected: 'xmark', android: 'close' },
  chevronUpDown: { ios: 'chevron.up.chevron.down', iosSelected: 'chevron.up.chevron.down', android: 'unfold_more' },
  more: { ios: 'ellipsis', iosSelected: 'ellipsis', android: 'more_horiz' },
  settings: { ios: 'gearshape', iosSelected: 'gearshape.fill', android: 'settings' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', iosSelected: 'rectangle.portrait.and.arrow.right', android: 'logout' },

  // Status (always paired with a word)
  check: { ios: 'checkmark', iosSelected: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', iosSelected: 'checkmark.circle.fill', android: 'check_circle' },
  verified: { ios: 'checkmark.seal.fill', iosSelected: 'checkmark.seal.fill', android: 'verified' },
  clock: { ios: 'clock', iosSelected: 'clock.fill', android: 'schedule' },
  waiting: { ios: 'hourglass', iosSelected: 'hourglass', android: 'hourglass_empty' },
  alert: { ios: 'exclamationmark.circle.fill', iosSelected: 'exclamationmark.circle.fill', android: 'error' },
  cancelled: { ios: 'xmark.circle', iosSelected: 'xmark.circle.fill', android: 'cancel' },
  noShow: { ios: 'person.fill.xmark', iosSelected: 'person.fill.xmark', android: 'person_off' },
  circle: { ios: 'circle', iosSelected: 'circle', android: 'radio_button_unchecked' },
  info: { ios: 'info.circle', iosSelected: 'info.circle.fill', android: 'info' },
  warning: { ios: 'exclamationmark.triangle', iosSelected: 'exclamationmark.triangle.fill', android: 'warning' },
  dot: { ios: 'circle.fill', iosSelected: 'circle.fill', android: 'circle' },
  worked: { ios: 'star', iosSelected: 'star.fill', android: 'star' },

  // Actions and content
  add: { ios: 'plus', iosSelected: 'plus', android: 'add' },
  minus: { ios: 'minus', iosSelected: 'minus', android: 'remove' },
  send: { ios: 'arrow.up', iosSelected: 'arrow.up', android: 'arrow_upward' },
  message: { ios: 'bubble.left', iosSelected: 'bubble.left.fill', android: 'chat_bubble' },
  call: { ios: 'phone', iosSelected: 'phone.fill', android: 'call' },
  directions: { ios: 'map', iosSelected: 'map.fill', android: 'map' },
  calendarAdd: { ios: 'calendar.badge.plus', iosSelected: 'calendar.badge.plus', android: 'event' },
  camera: { ios: 'camera', iosSelected: 'camera.fill', android: 'photo_camera' },
  photo: { ios: 'photo', iosSelected: 'photo.fill', android: 'image' },
  document: { ios: 'doc.text', iosSelected: 'doc.text.fill', android: 'description' },
  upload: { ios: 'square.and.arrow.up', iosSelected: 'square.and.arrow.up', android: 'upload' },
  edit: { ios: 'pencil', iosSelected: 'pencil', android: 'edit' },
  trash: { ios: 'trash', iosSelected: 'trash.fill', android: 'delete' },
  location: { ios: 'mappin.and.ellipse', iosSelected: 'mappin.and.ellipse', android: 'location_on' },
  money: { ios: 'sterlingsign.circle', iosSelected: 'sterlingsign.circle.fill', android: 'currency_pound' },
  people: { ios: 'person.2', iosSelected: 'person.2.fill', android: 'group' },
  person: { ios: 'person', iosSelected: 'person.fill', android: 'person' },
  link: { ios: 'link', iosSelected: 'link', android: 'link' },
  instagram: { ios: 'camera.aperture', iosSelected: 'camera.aperture', android: 'photo_camera' },
  mail: { ios: 'envelope', iosSelected: 'envelope.fill', android: 'mail' },
  lock: { ios: 'lock', iosSelected: 'lock.fill', android: 'lock' },
  eye: { ios: 'eye', iosSelected: 'eye.fill', android: 'visibility' },
  eyeOff: { ios: 'eye.slash', iosSelected: 'eye.slash.fill', android: 'visibility_off' },
  textSize: { ios: 'textformat.size', iosSelected: 'textformat.size', android: 'format_size' },
  help: { ios: 'questionmark.circle', iosSelected: 'questionmark.circle.fill', android: 'help' },
  refresh: { ios: 'arrow.clockwise', iosSelected: 'arrow.clockwise', android: 'refresh' },
  offline: { ios: 'wifi.slash', iosSelected: 'wifi.slash', android: 'wifi_off' },
  sun: { ios: 'sun.max', iosSelected: 'sun.max.fill', android: 'light_mode' },
  moon: { ios: 'moon', iosSelected: 'moon.fill', android: 'dark_mode' },
  kitchen: { ios: 'frying.pan', iosSelected: 'frying.pan.fill', android: 'skillet' },
  pastry: { ios: 'birthday.cake', iosSelected: 'birthday.cake.fill', android: 'cake' },
  bar: { ios: 'wineglass', iosSelected: 'wineglass.fill', android: 'local_bar' },
  sommelier: { ios: 'wineglass', iosSelected: 'wineglass.fill', android: 'wine_bar' },
  floor: { ios: 'fork.knife', iosSelected: 'fork.knife', android: 'restaurant' },
} as const satisfies Record<string, { ios: SFSymbol; iosSelected: SFSymbol; android: string }>;

export type IconName = keyof typeof icons;
