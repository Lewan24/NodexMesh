using Xunit;

// Each integration test owns a TestServer and an in-memory database. Keeping those hosts
// serial avoids shared process-wide configuration (Serilog and the minimal-host entry point)
// racing while the application is bootstrapped.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
