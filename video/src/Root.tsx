import React from 'react'
import { Composition } from 'remotion'
import { CommandoCard, schema } from './CommandoCard'

// Template video is ~8s at 30fps = 240 frames
const DURATION_IN_FRAMES = 240
const FPS = 30
const WIDTH = 720
const HEIGHT = 1280

const STORE =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co') +
  '/storage/v1/object/public'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="commando-card"
        component={CommandoCard}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        schema={schema}
        defaultProps={{
          cls: 'commando',
          callsign: 'MĀRIS.N',
          kd: '3/1.25',
          accuracy: '13%',
          shots: '1,250',
          team: 'red' as const,
          templateUrl: `${STORE}/card-templates/commando.mp4`,
        }}
      />
    </>
  )
}
