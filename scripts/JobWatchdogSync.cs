using System;
using System.Diagnostics;
using System.IO;

namespace JobWatchdog
{
    class Program
    {
        static int Main(string[] args)
        {
            Console.Title = "Bubu-Dudu Job Watchdog & Circular Synchronizer";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==================================================================");
            Console.WriteLine("   BUBU-DUDU JOB WATCHDOG & RECRUITMENT SYNCHRONIZER (DAILY RUN)  ");
            Console.WriteLine("==================================================================");
            Console.ResetColor();

            // Locate script directory
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string scriptPath = Path.Combine(exeDir, "scripts", "sync_engine.js");

            // Fallback if exe is inside scripts folder
            if (!File.Exists(scriptPath))
            {
                scriptPath = Path.Combine(exeDir, "sync_engine.js");
            }

            // Fallback if exe is in workspace root
            if (!File.Exists(scriptPath))
            {
                scriptPath = Path.Combine(exeDir, "job-portal", "scripts", "sync_engine.js");
            }

            if (!File.Exists(scriptPath))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[-] Error: Could not locate sync_engine.js!");
                Console.WriteLine("    Searched in: " + scriptPath);
                Console.ResetColor();
                PauseIfInteractive(args);
                return 1;
            }

            // Locate node.exe
            string nodePath = "node";

            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("[*] Starting official portal scraper & deduplication sync...");
            Console.ResetColor();

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nodePath;
                psi.Arguments = "\"" + scriptPath + "\"";
                psi.WorkingDirectory = Path.GetDirectoryName(Path.GetDirectoryName(scriptPath));
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = false;
                psi.RedirectStandardError = false;

                using (Process proc = Process.Start(psi))
                {
                    proc.WaitForExit();
                    int exitCode = proc.ExitCode;

                    if (exitCode == 0)
                    {
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine("\n[+] Step 1 Completed: Circular database refreshed & deduplicated.");
                        Console.ResetColor();

                        string notifyScript = Path.Combine(Path.GetDirectoryName(scriptPath), "notify_whatsapp.js");
                        if (File.Exists(notifyScript))
                        {
                            Console.ForegroundColor = ConsoleColor.Cyan;
                            Console.WriteLine("\n[*] Step 2: Checking & dispatching WhatsApp group alerts...");
                            Console.ResetColor();

                            try
                            {
                                ProcessStartInfo notifyPsi = new ProcessStartInfo();
                                notifyPsi.FileName = nodePath;
                                notifyPsi.Arguments = "\"" + notifyScript + "\"";
                                notifyPsi.WorkingDirectory = Path.GetDirectoryName(Path.GetDirectoryName(scriptPath));
                                notifyPsi.UseShellExecute = false;
                                notifyPsi.RedirectStandardOutput = false;
                                notifyPsi.RedirectStandardError = false;

                                using (Process notifyProc = Process.Start(notifyPsi))
                                {
                                    notifyProc.WaitForExit();
                                }
                            }
                            catch (Exception notifyEx)
                            {
                                Console.ForegroundColor = ConsoleColor.DarkYellow;
                                Console.WriteLine("[!] WhatsApp notification step skipped: " + notifyEx.Message);
                                Console.ResetColor();
                            }
                        }

                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine("\n[+] All tasks finished successfully!");
                        Console.WriteLine("    • Data store: job-portal\\data\\circulars.json");
                        Console.WriteLine("    • Web Portal: job-portal\\index.html (PWA Ready)");
                        Console.ResetColor();
                    }
                    else
                    {
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine("\n[-] Sync finished with error code: " + exitCode);
                        Console.ResetColor();
                    }

                    PauseIfInteractive(args);
                    return exitCode;
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("\n[-] Execution Exception: " + ex.Message);
                Console.WriteLine("    Ensure Node.js is installed on your computer.");
                Console.ResetColor();
                PauseIfInteractive(args);
                return 1;
            }
        }

        static void PauseIfInteractive(string[] args)
        {
            bool isSilent = false;
            foreach (string arg in args)
            {
                if (arg.Equals("--silent", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("-s", StringComparison.OrdinalIgnoreCase))
                {
                    isSilent = true;
                    break;
                }
            }

            if (!isSilent)
            {
                Console.WriteLine();
                Console.ForegroundColor = ConsoleColor.DarkGray;
                Console.WriteLine("Press any key to close this window...");
                Console.ResetColor();
                try
                {
                    Console.ReadKey(true);
                }
                catch { }
            }
        }
    }
}
