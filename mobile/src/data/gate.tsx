// The gate every signed-in screen opens with: loading, a load error, the
// approval wait (§1.3), then the screen. Lives in the data layer because it
// reads the store; it only arranges kit parts (src/ui never imports data).
import { useState, type ReactNode } from 'react';

import type { Data, Member } from '@/domain';
import { ErrorState, Loading, Screen, WaitingForApproval, type EmptyProps, type LoadingProps, type ScreenProps } from '@/ui';

import { useLive, type Live } from './store';

export type LiveReady = { data: Data; me: Member; side: 'talent' | 'venue'; live: Live };

export type LiveGateProps = {
  /** The ready screen. A function gets the non-null snapshot. */
  children: ReactNode | ((ready: LiveReady) => ReactNode);
  /** Show "Waiting for approval" while not approved (default true). */
  approval?: boolean;
  /** Shown instead of the screen while waiting, e.g. `{ label: 'Edit profile', onPress }`. */
  waitingAction?: EmptyProps['action'];
  /**
   * Rendered before the state inside the gate's own Screen, e.g.
   * `<><Stack.Screen options={{ title: 'Book' }} /><HeaderActions /></>`.
   */
  header?: ReactNode;
  /** Passed to the gate's Screen (the serif title on a tab root, `insideTabs`). */
  title?: ScreenProps['title'];
  /** Skeleton shape while loading; default 3 tickets. */
  loading?: LoadingProps;
  /** Render just the state (no Screen), for use inside a screen you already drew. */
  bare?: boolean;
};

/**
 * `<LiveGate header={…} title="Shifts">{({ data, me }) => <Screen …>…</Screen>}</LiveGate>`
 * Loading → skeleton; load failed with nothing to show → one line + Try again;
 * not approved → WaitingForApproval; otherwise the children.
 */
export function LiveGate({ children, approval = true, waitingAction, header, title, loading, bare }: LiveGateProps) {
  const live = useLive();
  const [retrying, setRetrying] = useState(false);
  const { data, me, side, approved, status } = live;

  let state: ReactNode = null;
  if (!data || !me || !side) {
    state =
      status === 'error' ? (
        <ErrorState
          message={live.error ?? undefined}
          retrying={retrying}
          onRetry={() => {
            setRetrying(true);
            live.reload().finally(() => setRetrying(false));
          }}
        />
      ) : (
        <Loading {...loading} />
      );
  } else if (approval && !approved) {
    state = <WaitingForApproval action={waitingAction} />;
  }

  if (state == null && data && me && side) {
    return <>{typeof children === 'function' ? children({ data, me, side, live }) : children}</>;
  }
  if (bare) return <>{state}</>;
  return (
    <Screen title={title}>
      {header}
      {state}
    </Screen>
  );
}
