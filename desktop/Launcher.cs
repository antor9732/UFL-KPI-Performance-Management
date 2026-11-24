// KPI Performance Management System
// Desktop launcher (KPI_System.exe)
//
// Runs the whole app on the client PC with NO separately installed server:
//   * uses the bundled portable PHP (runtime\php) and Node.js (runtime\node)
//   * on first run: unpacks server\vendor.zip, creates .env + APP_KEY,
//     creates the SQLite database from the seeded copy and storage folders
//   * runs pending database migrations (safe for app updates)
//   * starts PHP's built-in web server on 127.0.0.1 (first free port 8000-8010)
//   * opens the dashboard in the default browser and sits in the system tray
//   * the PHP server is bound to a Windows Job Object, so it always stops
//     when the launcher stops (no orphaned php.exe left behind)
//
// Build (Windows, no Visual Studio needed):
//   C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /out:KPI_System.exe ^
//     /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.IO.Compression.dll ^
//     /r:System.IO.Compression.FileSystem.dll desktop\Launcher.cs

using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace KpiLauncher
{
    static class Program
    {
        private const string AppTitle = "KPI Performance System";
        private const string MutexName = "KPI_Performance_System_Mutex";
        private const int FirstPort = 8000;
        private const int LastPort = 8010;

        private static string _baseDir;
        private static string _serverDir;
        private static string _phpBin;
        private static string _phpIni;
        private static string _phpExtDir;
        private static string _logFile;
        private static string _portFile;
        private static int _port;

        private static Process _serverProcess;
        private static NotifyIcon _trayIcon;
        private static IntPtr _job = IntPtr.Zero;
        private static bool _exiting;

        private static string Url { get { return "http://127.0.0.1:" + _port; } }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            _baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
            _serverDir = Path.Combine(_baseDir, "server");
            _logFile = Path.Combine(_serverDir, "storage", "logs", "launcher.log");
            _portFile = Path.Combine(_serverDir, "storage", "app", "desktop_port.txt");

            bool createdNew;
            using (Mutex mutex = new Mutex(true, MutexName, out createdNew))
            {
                if (!createdNew)
                {
                    // Already running: just open the dashboard of the running instance.
                    int runningPort = ReadPortFile();
                    if (runningPort > 0 && IsOurServer(runningPort))
                    {
                        _port = runningPort;
                        OpenAppWindow();
                    }
                    else
                    {
                        MessageBox.Show("The KPI System is already starting. Please wait a few seconds.",
                            AppTitle, MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                    return;
                }

                Run();
            }
        }

        private static void Run()
        {
            if (!Directory.Exists(_serverDir))
            {
                Fail("Application files are missing (server folder not found).\n\nPlease reinstall the KPI Performance System.");
                return;
            }

            // Splash window while we prepare (first run unpacks ~200 MB).
            Form splash = BuildSplash();
            Label status = (Label)splash.Controls[0];
            string error = null;

            Thread worker = new Thread(() =>
            {
                try
                {
                    Prepare(msg => SetStatus(splash, status, msg));
                }
                catch (Exception ex)
                {
                    error = ex.Message;
                    Log("ERROR: " + ex);
                }
                finally
                {
                    try { splash.BeginInvoke(new Action(splash.Close)); } catch { }
                }
            });
            worker.IsBackground = true;
            splash.Shown += (s, e) => worker.Start();
            Application.Run(splash);
            worker.Join();

            if (error != null)
            {
                StopServer();
                Fail("Unable to start the KPI System:\n\n" + error + "\n\nDetails: " + _logFile);
                return;
            }

            OpenAppWindow();
            ShowTray();
            Application.ApplicationExit += (s, e) => StopServer();
            Application.Run();
        }

        // ------------------------------------------------------------------
        // Preparation (runs on worker thread)
        // ------------------------------------------------------------------
        private static void Prepare(Action<string> status)
        {
            status("Checking runtime...");
            LocatePhp();

            status("Preparing application files...");
            EnsureDirectories();
            EnsureVendor(status);
            EnsureEnvFile();
            EnsureDatabase();

            // Reuse an already running instance (e.g. started by start-kpi.bat)
            for (int p = FirstPort; p <= LastPort; p++)
            {
                // Only probe ports that are actually in use: an HTTP probe of a closed
                // port on Windows waits ~1.5s, which made startup ~17s slower.
                if (IsPortInUse(p) && IsOurServer(p))
                {
                    _port = p;
                    Log("Reusing running server on port " + p);
                    WritePortFile();
                    return;
                }
            }

            status("Updating database...");
            try
            {
                RunArtisan("migrate --force", 180000);
            }
            catch (Exception ex)
            {
                // Not fatal: the seeded database is already migrated. Keep going and
                // let the server health check decide whether the app can run.
                Log("WARNING: migration step failed: " + ex.Message);
            }

            status("Starting local server...");
            _port = FindFreePort();
            if (_port == 0)
                throw new Exception("No free port found between " + FirstPort + " and " + LastPort + ".");

            StartServer();

            status("Waiting for server...");
            DateTime until = DateTime.Now.AddSeconds(45);
            while (DateTime.Now < until)
            {
                if (_serverProcess.HasExited)
                    throw new Exception("PHP server stopped unexpectedly (exit code " + _serverProcess.ExitCode + ").");
                if (IsOurServer(_port))
                {
                    WritePortFile();
                    Log("Server ready on " + Url);
                    return;
                }
                Thread.Sleep(300);
            }
            throw new Exception("The local server did not respond on " + Url + ".");
        }

        private static void LocatePhp()
        {
            string phpDir = Path.Combine(_baseDir, "runtime", "php");
            _phpBin = Path.Combine(phpDir, "php.exe");
            _phpIni = Path.Combine(phpDir, "php.ini");
            _phpExtDir = Path.Combine(phpDir, "ext");

            if (!File.Exists(_phpBin))
                throw new Exception("Bundled PHP runtime not found: " + _phpBin);
        }

        private static void EnsureDirectories()
        {
            string[] dirs =
            {
                Path.Combine(_serverDir, "bootstrap", "cache"),
                Path.Combine(_serverDir, "storage", "app", "public", "avatars"),
                Path.Combine(_serverDir, "storage", "app", "private"),
                Path.Combine(_serverDir, "storage", "app", "temp"),
                Path.Combine(_serverDir, "storage", "framework", "cache", "data"),
                Path.Combine(_serverDir, "storage", "framework", "sessions"),
                Path.Combine(_serverDir, "storage", "framework", "views"),
                Path.Combine(_serverDir, "storage", "logs"),
                Path.Combine(_serverDir, "database"),
            };
            foreach (string d in dirs) Directory.CreateDirectory(d);
        }

        // Unpack server\vendor.zip (PHP libraries) on first run or after an update.
        private static void EnsureVendor(Action<string> status)
        {
            string vendorDir = Path.Combine(_serverDir, "vendor");
            string autoload = Path.Combine(vendorDir, "autoload.php");
            string zip = Path.Combine(_serverDir, "vendor.zip");
            string marker = Path.Combine(vendorDir, ".kpi_vendor_stamp");

            if (!File.Exists(zip))
            {
                if (File.Exists(autoload)) return; // developer machine with composer install
                throw new Exception("PHP libraries are missing (server\\vendor.zip not found).");
            }

            FileInfo zi = new FileInfo(zip);
            string stamp = zi.Length + "|" + zi.LastWriteTimeUtc.Ticks;
            if (File.Exists(autoload) && File.Exists(marker) && File.ReadAllText(marker).Trim() == stamp)
                return;

            status("First-time setup: unpacking libraries (about 1 minute)...");
            Log("Extracting vendor.zip (" + stamp + ")");

            string tmp = Path.Combine(_serverDir, "vendor_tmp");
            if (Directory.Exists(tmp)) Directory.Delete(tmp, true);
            ZipFile.ExtractToDirectory(zip, tmp);

            string extracted = Path.Combine(tmp, "vendor");
            if (!Directory.Exists(extracted)) extracted = tmp;

            if (Directory.Exists(vendorDir)) Directory.Delete(vendorDir, true);
            Directory.Move(extracted, vendorDir);
            if (Directory.Exists(tmp)) Directory.Delete(tmp, true);

            File.WriteAllText(marker, stamp);

            // Old package caches may point at removed classes after an update.
            foreach (string f in new[] { "packages.php", "services.php", "config.php" })
            {
                string p = Path.Combine(_serverDir, "bootstrap", "cache", f);
                if (File.Exists(p)) File.Delete(p);
            }
        }

        // Create server\.env with a unique APP_KEY (missing key = HTTP 500 on every page).
        private static void EnsureEnvFile()
        {
            string env = Path.Combine(_serverDir, ".env");
            if (File.Exists(env))
            {
                string existing = File.ReadAllText(env);
                if (existing.Contains("APP_KEY=base64:")) return;
                File.WriteAllText(env, SetAppKey(existing));
                Log("APP_KEY added to existing .env");
                return;
            }

            string template = Path.Combine(_serverDir, "desktop-env.template");
            if (!File.Exists(template)) template = Path.Combine(_serverDir, ".env.example");
            string content = File.Exists(template)
                ? File.ReadAllText(template)
                : "APP_ENV=production\nAPP_KEY=\nAPP_DEBUG=false\nDB_CONNECTION=sqlite\nSESSION_DRIVER=file\nCACHE_STORE=file\nQUEUE_CONNECTION=sync\n";

            File.WriteAllText(env, SetAppKey(content));
            Log(".env created");
        }

        private static string SetAppKey(string content)
        {
            byte[] key = new byte[32];
            using (var rng = new RNGCryptoServiceProvider()) rng.GetBytes(key);
            string line = "APP_KEY=base64:" + Convert.ToBase64String(key);

            StringBuilder sb = new StringBuilder();
            bool found = false;
            foreach (string raw in content.Replace("\r\n", "\n").Split(new[] { '\n' }))
            {
                if (raw.StartsWith("APP_KEY=")) { sb.Append(line).Append("\r\n"); found = true; }
                else sb.Append(raw).Append("\r\n");
            }
            if (!found) sb.Insert(0, line + "\r\n");
            return sb.ToString().TrimEnd() + "\r\n";
        }

        // Create the working database from the pre-seeded copy if missing.
        private static void EnsureDatabase()
        {
            string db = Path.Combine(_serverDir, "database", "database.sqlite");
            if (File.Exists(db) && new FileInfo(db).Length > 0) return;

            string seed = Path.Combine(_serverDir, "database", "seed.sqlite");
            if (File.Exists(seed))
            {
                File.Copy(seed, db, true);
                File.SetAttributes(db, FileAttributes.Normal); // never inherit read-only
                Log("database.sqlite created from the seed database");
            }
            else
            {
                File.WriteAllBytes(db, new byte[0]); // migrations will build the schema
                Log("Empty database.sqlite created");
            }
        }

        // ------------------------------------------------------------------
        // PHP processes
        // ------------------------------------------------------------------
        private static string PhpBaseArgs()
        {
            // extension_dir in php.ini is relative ("ext") and would resolve against the
            // working directory -> pdo_sqlite, mbstring, openssl... fail to load.
            string args = "-c \"" + _phpIni + "\" -d extension_dir=\"" + _phpExtDir + "\"";
            // Windows PHP has no system certificate store: needed for Google sign-in / Drive backup.
            string ca = Path.Combine(_baseDir, "runtime", "php", "extras", "ssl", "cacert.pem");
            if (File.Exists(ca)) args += " -d curl.cainfo=\"" + ca + "\" -d openssl.cafile=\"" + ca + "\"";
            return args;
        }

        private static void RunArtisan(string args, int timeoutMs)
        {
            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = _phpBin,
                Arguments = PhpBaseArgs() + " artisan " + args + " --no-interaction",
                WorkingDirectory = _serverDir,
                CreateNoWindow = true,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                WindowStyle = ProcessWindowStyle.Hidden,
            };
            using (Process p = Process.Start(psi))
            {
                AssignToJob(p);
                var outTask = p.StandardOutput.ReadToEndAsync();
                var errTask = p.StandardError.ReadToEndAsync();
                if (!p.WaitForExit(timeoutMs))
                {
                    try { p.Kill(); } catch { }
                    throw new Exception("'artisan " + args + "' timed out.");
                }
                string output = (outTask.Result + "\n" + errTask.Result).Trim();
                Log("artisan " + args + " -> exit " + p.ExitCode + (output.Length > 0 ? "\n" + output : ""));
                if (p.ExitCode != 0)
                    throw new Exception("'artisan " + args + "' failed:\n" + Tail(output, 600));
            }
        }

        private static void StartServer()
        {
            string router = Path.Combine(_serverDir, "server.php");
            string args = PhpBaseArgs() + " -S 127.0.0.1:" + _port + " -t \"" + Path.Combine(_serverDir, "public") + "\"";
            if (File.Exists(router)) args += " \"" + router + "\"";

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = _phpBin,
                Arguments = args,
                WorkingDirectory = _serverDir,
                CreateNoWindow = true,
                UseShellExecute = false,
                WindowStyle = ProcessWindowStyle.Hidden,
            };
            psi.EnvironmentVariables["APP_URL"] = "http://127.0.0.1:" + _port;

            Log("Starting: \"" + _phpBin + "\" " + args);
            _serverProcess = Process.Start(psi);
            AssignToJob(_serverProcess);
        }

        private static void StopServer()
        {
            if (_serverProcess != null)
            {
                try { if (!_serverProcess.HasExited) _serverProcess.Kill(); } catch { }
                _serverProcess = null;
            }
            try { if (File.Exists(_portFile)) File.Delete(_portFile); } catch { }
        }

        // ------------------------------------------------------------------
        // Port helpers
        // ------------------------------------------------------------------
        private static int FindFreePort()
        {
            for (int p = FirstPort; p <= LastPort; p++)
            {
                if (!IsPortInUse(p)) return p;
                Log("Port " + p + " is used by another program, trying next");
            }
            return 0;
        }

        private static bool IsPortInUse(int port)
        {
            try
            {
                TcpListener l = new TcpListener(IPAddress.Loopback, port);
                l.Start();
                l.Stop();
                return false;
            }
            catch
            {
                return true;
            }
        }

        // True only if the port is served by THIS application (not some other program).
        private static bool IsOurServer(int port)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/api/v1/ping");
                req.Proxy = null;
                req.Timeout = 1500;
                req.ReadWriteTimeout = 1500;
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                using (StreamReader sr = new StreamReader(res.GetResponseStream()))
                {
                    return res.StatusCode == HttpStatusCode.OK && sr.ReadToEnd().Contains("kpi-system");
                }
            }
            catch
            {
                return false;
            }
        }

        private static int ReadPortFile()
        {
            try
            {
                int p;
                if (File.Exists(_portFile) && int.TryParse(File.ReadAllText(_portFile).Trim(), out p)) return p;
            }
            catch { }
            return 0;
        }

        private static void WritePortFile()
        {
            try { File.WriteAllText(_portFile, _port.ToString()); } catch { }
        }

        // ------------------------------------------------------------------
        // UI
        // ------------------------------------------------------------------
        private static Form BuildSplash()
        {
            Form f = new Form
            {
                Text = AppTitle,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                StartPosition = FormStartPosition.CenterScreen,
                Size = new Size(460, 150),
                MaximizeBox = false,
                MinimizeBox = false,
                ShowInTaskbar = true,
                BackColor = Color.FromArgb(15, 23, 42),
                Icon = AppIcon(),
            };
            Label l = new Label
            {
                Dock = DockStyle.Fill,
                TextAlign = ContentAlignment.MiddleCenter,
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 10f),
                Text = "Starting KPI Performance System...",
            };
            f.Controls.Add(l);
            return f;
        }

        private static void SetStatus(Form f, Label l, string msg)
        {
            Log(msg);
            try { f.BeginInvoke(new Action(() => l.Text = msg)); } catch { }
        }

        private static void ShowTray()
        {
            ContextMenu menu = new ContextMenu();
            menu.MenuItems.Add("Open KPI Dashboard", (s, e) => OpenAppWindow());
            menu.MenuItems.Add("Open Data Folder", (s, e) =>
            {
                try { Process.Start("explorer.exe", "\"" + Path.Combine(_serverDir, "database") + "\""); } catch { }
            });
            menu.MenuItems.Add("-");
            menu.MenuItems.Add("Stop Server && Exit", (s, e) => CleanupAndExit());

            _trayIcon = new NotifyIcon
            {
                Icon = AppIcon(),
                Text = "KPI Performance System (port " + _port + ")",
                ContextMenu = menu,
                Visible = true,
            };
            _trayIcon.DoubleClick += (s, e) => OpenAppWindow();
            _trayIcon.ShowBalloonTip(3000, AppTitle,
                "System is running. Closing the KPI window stops the system. Double-click this icon to reopen it.",
                ToolTipIcon.Info);

            // Watch the server; if PHP dies, tell the user instead of silently failing.
            System.Windows.Forms.Timer watchdog = new System.Windows.Forms.Timer { Interval = 5000 };
            watchdog.Tick += (s, e) =>
            {
                if (_exiting || _serverProcess == null) return;
                if (_serverProcess.HasExited)
                {
                    watchdog.Stop();
                    Log("Server process exited with code " + _serverProcess.ExitCode);
                    MessageBox.Show("The KPI local server stopped unexpectedly.\nPlease start the application again.\n\nLog: " + _logFile,
                        AppTitle, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    CleanupAndExit();
                }
            };
            watchdog.Start();

            // Closing the app window closes the whole system (like a normal program).
            System.Windows.Forms.Timer windowWatch = new System.Windows.Forms.Timer { Interval = 2000 };
            bool seenOpen = false;
            windowWatch.Tick += (s, e) =>
            {
                if (_exiting || !_usingAppWindow) return;
                bool open = IsAppWindowOpen();
                if (open) { seenOpen = true; return; }
                // Give the window time to appear before treating "closed" as final.
                if (seenOpen || (DateTime.Now - _windowOpenedAt).TotalSeconds > 30)
                {
                    if (!seenOpen) { _usingAppWindow = false; return; } // could not track it: keep tray mode
                    windowWatch.Stop();
                    Log("App window closed by user - shutting down");
                    CleanupAndExit();
                }
            };
            windowWatch.Start();
        }

        private static Icon AppIcon()
        {
            try
            {
                string ico = Path.Combine(_baseDir, "app.ico");
                if (File.Exists(ico)) return new Icon(ico);
                Icon own = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                if (own != null) return own;
            }
            catch { }
            return SystemIcons.Application;
        }

        // ------------------------------------------------------------------
        // App window: Microsoft Edge (built into Windows 10/11) or Chrome in
        // "app mode" = its own window with no address bar / tabs, so the
        // system looks and behaves like a normal desktop program.
        // Falls back to the default browser only if neither is installed.
        // ------------------------------------------------------------------
        private static string _windowProfileDir;
        private static bool _usingAppWindow;
        private static DateTime _windowOpenedAt;

        private static string WindowProfileDir
        {
            get
            {
                if (_windowProfileDir == null)
                {
                    _windowProfileDir = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                        "KPI Performance System", "AppWindow");
                }
                return _windowProfileDir;
            }
        }

        private static string FindAppModeBrowser()
        {
            string pf86 = Environment.GetEnvironmentVariable("ProgramFiles(x86)") ?? "";
            string pf = Environment.GetEnvironmentVariable("ProgramFiles") ?? "";
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string[] candidates =
            {
                Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(local, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(local, @"Google\Chrome\Application\chrome.exe"),
            };
            foreach (string c in candidates)
            {
                try { if (c.Length > 0 && File.Exists(c)) return c; } catch { }
            }
            return null;
        }

        private static void OpenAppWindow()
        {
            string exe = FindAppModeBrowser();
            if (exe != null)
            {
                try
                {
                    Directory.CreateDirectory(WindowProfileDir);
                    string args =
                        "--app=\"" + Url + "/\"" +
                        " --user-data-dir=\"" + WindowProfileDir + "\"" +
                        " --start-maximized --window-size=1440,900" +
                        " --no-first-run --no-default-browser-check" +
                        " --disable-features=Translate,msEdgeStartupBoost";
                    Process.Start(new ProcessStartInfo(exe, args) { UseShellExecute = false });
                    _usingAppWindow = true;
                    _windowOpenedAt = DateTime.Now;
                    Log("App window opened with " + Path.GetFileName(exe));
                    return;
                }
                catch (Exception ex)
                {
                    Log("App window failed (" + ex.Message + "), using default browser");
                }
            }

            try { Process.Start(new ProcessStartInfo(Url + "/") { UseShellExecute = true }); }
            catch (Exception ex) { Log("Browser open failed: " + ex.Message); }
        }

        // Chromium keeps <profile>\lockfile open while any window of that profile is open.
        private static bool IsAppWindowOpen()
        {
            string lockFile = Path.Combine(WindowProfileDir, "lockfile");
            if (!File.Exists(lockFile)) return false;
            try
            {
                using (new FileStream(lockFile, FileMode.Open, FileAccess.Write, FileShare.ReadWrite)) { }
                return false; // stale file, nobody holds it
            }
            catch (IOException)
            {
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static void CleanupAndExit()
        {
            _exiting = true;
            if (_trayIcon != null)
            {
                _trayIcon.Visible = false;
                _trayIcon.Dispose();
                _trayIcon = null;
            }
            StopServer();
            Application.Exit();
            Environment.Exit(0);
        }

        private static void Fail(string message)
        {
            MessageBox.Show(message, AppTitle + " - Startup Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }

        // ------------------------------------------------------------------
        // Logging
        // ------------------------------------------------------------------
        private static readonly object LogLock = new object();

        private static void Log(string msg)
        {
            try
            {
                lock (LogLock)
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(_logFile));
                    FileInfo fi = new FileInfo(_logFile);
                    if (fi.Exists && fi.Length > 2 * 1024 * 1024) fi.Delete();
                    File.AppendAllText(_logFile, "[" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "] " + msg + Environment.NewLine);
                }
            }
            catch { }
        }

        private static string Tail(string s, int max)
        {
            return s.Length <= max ? s : "..." + s.Substring(s.Length - max);
        }

        // ------------------------------------------------------------------
        // Windows Job Object: child php.exe is killed when the launcher ends,
        // even if the launcher is killed from Task Manager.
        // ------------------------------------------------------------------
        private static void AssignToJob(Process p)
        {
            try
            {
                if (_job == IntPtr.Zero)
                {
                    _job = CreateJobObject(IntPtr.Zero, null);
                    var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
                    info.BasicLimitInformation.LimitFlags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
                    int len = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
                    IntPtr ptr = Marshal.AllocHGlobal(len);
                    try
                    {
                        Marshal.StructureToPtr(info, ptr, false);
                        SetInformationJobObject(_job, 9 /* ExtendedLimitInformation */, ptr, (uint)len);
                    }
                    finally { Marshal.FreeHGlobal(ptr); }
                }
                AssignProcessToJobObject(_job, p.Handle);
            }
            catch (Exception ex)
            {
                Log("Job object not available: " + ex.Message);
            }
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
        {
            public long PerProcessUserTimeLimit;
            public long PerJobUserTimeLimit;
            public uint LimitFlags;
            public UIntPtr MinimumWorkingSetSize;
            public UIntPtr MaximumWorkingSetSize;
            public uint ActiveProcessLimit;
            public UIntPtr Affinity;
            public uint PriorityClass;
            public uint SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct IO_COUNTERS
        {
            public ulong ReadOperationCount;
            public ulong WriteOperationCount;
            public ulong OtherOperationCount;
            public ulong ReadTransferCount;
            public ulong WriteTransferCount;
            public ulong OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
        {
            public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
            public IO_COUNTERS IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryUsed;
            public UIntPtr PeakJobMemoryUsed;
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
        private static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

        [DllImport("kernel32.dll")]
        private static extern bool SetInformationJobObject(IntPtr hJob, int infoType, IntPtr lpInfo, uint cbInfoLength);

        [DllImport("kernel32.dll")]
        private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);
    }
}
