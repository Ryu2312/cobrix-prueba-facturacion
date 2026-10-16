import { CompanySettings } from './company-settings.ts'
import { IspConnection } from './isp-connection.ts'
import { ImportPolicy } from './import-policy.ts'
import { SyncSchedule } from './sync-schedule.ts'

export interface SettingsProps {
  company: CompanySettings
  isp: IspConnection
  importPolicy: ImportPolicy
  schedule: SyncSchedule
}

export class Settings {
  private constructor(
    readonly company: CompanySettings,
    readonly isp: IspConnection,
    readonly importPolicy: ImportPolicy,
    readonly schedule: SyncSchedule
  ) {}

  static create(props: SettingsProps): Settings {
    return new Settings(
      props.company,
      props.isp,
      props.importPolicy,
      props.schedule
    )
  }

  updateCompany(company: CompanySettings): Settings {
    return Settings.create({
      ...this.toProps(),
      company,
    })
  }

  updateIsp(isp: IspConnection): Settings {
    return Settings.create({
      ...this.toProps(),
      isp,
    })
  }

  updateImportPolicy(importPolicy: ImportPolicy): Settings {
    return Settings.create({
      ...this.toProps(),
      importPolicy,
    })
  }

  updateSchedule(schedule: SyncSchedule): Settings {
    return Settings.create({
      ...this.toProps(),
      schedule,
    })
  }

  private toProps(): SettingsProps {
    return {
      company: this.company,
      isp: this.isp,
      importPolicy: this.importPolicy,
      schedule: this.schedule,
    }
  }
}
