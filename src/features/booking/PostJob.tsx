// Venue › Post a job (web `JobPostStart`): choose a team, then the composer.
import { router, Stack } from 'expo-router';

import { useLive } from '@/data/store';
import { HeaderActions } from '@/features/shell/HeaderActions';
import { ErrorState, Loading, Screen, WaitingForApproval } from '@/ui';

import { TeamMosaic } from './TeamMosaic';

export function PostJob() {
  const live = useLive();
  const { data, me, approved, status } = live;
  const header = (
    <>
      <Stack.Screen options={{ title: 'Post a job' }} />
      <HeaderActions />
    </>
  );
  if (!data || !me)
    return (
      <Screen>
        {header}
        {status === 'error' ? <ErrorState message={live.error ?? undefined} onRetry={() => void live.reload()} /> : <Loading count={2} />}
      </Screen>
    );
  if (!approved)
    return (
      <Screen>
        {header}
        <WaitingForApproval />
      </Screen>
    );
  return (
    <Screen onRefresh={() => void live.reload()}>
      {header}
      <TeamMosaic
        data={data}
        venue={me.id}
        caption={(team) => (team.length ? 'Post to this team' : 'Nobody in this team yet')}
        onPick={(team) => router.push({ pathname: '/compose', params: { team } })}
      />
    </Screen>
  );
}
