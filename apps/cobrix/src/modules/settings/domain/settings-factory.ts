import {
  CompanySettings,
  type CompanySettingsProps,
} from './company-settings.ts'
import { ImportPolicy, type ImportPolicyProps } from './import-policy.ts'
import { IspConnection, type IspConnectionProps } from './isp-connection.ts'
import { Settings } from './settings.ts'
import { SyncSchedule, type SyncScheduleProps } from './sync-schedule.ts'

export interface SettingsFactoryInput {
  readonly company: CompanySettingsProps
  readonly isp: IspConnectionProps
  readonly importPolicy: ImportPolicyProps
  readonly schedule: SyncScheduleProps
}

export class SettingsFactory {
  static create(input: SettingsFactoryInput): Settings {
    return Settings.create({
      company: CompanySettings.create(input.company),
      isp: IspConnection.create(input.isp),
      importPolicy: ImportPolicy.create(input.importPolicy),
      schedule: SyncSchedule.create(input.schedule),
    })
  }
}
