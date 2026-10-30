// Venue › Post a job (web `JobPostStart`): choose a team, then the composer.
import { router, Stack } from 'expo-router';

import { LiveGate, useRefresh } from '@/data';
import { HeaderActions } from '@/features/shell/HeaderActions';
import { Screen } from '@/ui';

import { TeamMosaic } from './TeamMosaic';

const header = (
  <>
    <Stack.Screen options={{ title: 'Post a job' }} />
    <HeaderActions />
  </>
);

export function PostJob() {
  const refresh = useRefresh();
  return (
    <LiveGate header={header} title="Post a job" loading={{ count: 2 }}>
      {({ data, me }) => (
        <Screen title="Post a job" {...refresh}>
          {header}
          <TeamMosaic
            data={data}
            venue={me.id}
            caption={(team) => (team.length ? 'Post to this team' : 'Nobody in this team yet')}
            onPick={(team) => router.push({ pathname: '/compose', params: { team } })}
          />
        </Screen>
      )}
    </LiveGate>
  );
}
