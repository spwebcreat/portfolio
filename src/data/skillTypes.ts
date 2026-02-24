export interface OrbitParams {
  radius: number
  height: number
  speed: number
  phase: number
  tilt: number
  tiltDir: number
}

export interface CrystalParams {
  model: string
  orbit: OrbitParams
  emissiveBase: number
  lightColor: string
}

export interface SkillEntry {
  id: string
  title: string
  aboutTitle: string
  description: string
  skillTags: string[]
  effectKey: string
  crystal: CrystalParams | null
}
