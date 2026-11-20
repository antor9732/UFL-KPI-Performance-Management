using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

namespace UflKpiLauncher
{
    static class Program
    {
        private static Process _serverProcess;
        private static NotifyIcon _trayIcon;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string serverDir = Path.Combine(baseDir, "server");
            string publicDir = Path.Combine(serverDir, "public");

            // Locate PHP
            string phpBin = "php";
            string bundledPhp = Path.Combine(baseDir, "runtime", "php", "php.exe");
            string laragonPhp = @"D:\laragon\bin\php\php-8.4.13-Win32-vs17-x64\php.exe";
            string laragonPhpC = @"C:\laragon\bin\php\php-8.4.13-Win32-vs17-x64\php.exe";

            if (File.Exists(bundledPhp))
            {
                phpBin = bundledPhp;
            }
            else if (File.Exists(laragonPhp))
            {
                phpBin = laragonPhp;
            }
            else if (File.Exists(laragonPhpC))
            {
                phpBin = laragonPhpC;
            }

            // Check if port 8000 is already active
            bool alreadyRunning = IsPortInUse(8000);

            if (!alreadyRunning)
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = phpBin,
                        Arguments = "-S 127.0.0.1:8000 -t \"" + publicDir + "\"",
                        WorkingDirectory = serverDir,
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };
                    _serverProcess = Process.Start(psi);
                }
                catch (Exception ex)
                {
                    MessageBox.Show(
                        "Unable to start UFL KPI Server: " + ex.Message + "\nPlease ensure runtime\\php\\php.exe is present.",
                        "Startup Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                // Wait up to 3 seconds for port to open
                for (int i = 0; i < 15; i++)
                {
                    Thread.Sleep(200);
                    if (IsPortInUse(8000)) break;
                }
            }

            // Launch default browser
            try
            {
                Process.Start(new ProcessStartInfo("http://127.0.0.1:8000") { UseShellExecute = true });
            }
            catch { }

            // System Tray Icon
            ContextMenu menu = new ContextMenu();
            menu.MenuItems.Add("Open KPI Dashboard", (s, e) =>
            {
                Process.Start(new ProcessStartInfo("http://127.0.0.1:8000") { UseShellExecute = true });
            });
            menu.MenuItems.Add("-");
            menu.MenuItems.Add("Stop Server & Exit", (s, e) =>
            {
                CleanupAndExit();
            });

            _trayIcon = new NotifyIcon
            {
                Icon = SystemIcons.Application,
                Text = "Utah Fashion Ltd. - KPI System (Active on :8000)",
                ContextMenu = menu,
                Visible = true
            };

            _trayIcon.DoubleClick += (s, e) =>
            {
                Process.Start(new ProcessStartInfo("http://127.0.0.1:8000") { UseShellExecute = true });
            };

            _trayIcon.ShowBalloonTip(
                2000,
                "Utah Fashion Ltd. KPI System",
                "System is active on http://127.0.0.1:8000. Double-click tray icon anytime to open.",
                ToolTipIcon.Info
            );

            Application.ApplicationExit += (s, e) => CleanupAndExit();
            Application.Run();
        }

        private static bool IsPortInUse(int port)
        {
            try
            {
                using (TcpClient tcp = new TcpClient())
                {
                    IAsyncResult ar = tcp.BeginConnect("127.0.0.1", port, null, null);
                    bool success = ar.AsyncWaitHandle.WaitOne(300);
                    if (!success) return false;
                    tcp.EndConnect(ar);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void CleanupAndExit()
        {
            if (_trayIcon != null)
            {
                _trayIcon.Visible = false;
                _trayIcon.Dispose();
                _trayIcon = null;
            }

            if (_serverProcess != null && !_serverProcess.HasExited)
            {
                try
                {
                    _serverProcess.Kill();
                }
                catch { }
                _serverProcess = null;
            }

            Application.Exit();
            Environment.Exit(0);
        }
    }
}
