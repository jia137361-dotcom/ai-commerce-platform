// Local type definitions for MedusaJS v2 compatibility
// ExecArgs type used by medusa exec scripts

export type ExecArgs = {
  container: {
    resolve: <T = unknown>(registrationName: string) => T
  }
}
