import React from 'react';
import { User } from '@supabase/supabase-js';
import { RefreshCw, Book, Sparkles, Palette } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ThemeConfig, NotebookConfig } from '../../types';

interface SettingsViewProps {
  theme: ThemeConfig;
  setTheme: React.Dispatch<React.SetStateAction<ThemeConfig>>;
  notebookConfig: NotebookConfig;
  setNotebookConfig: React.Dispatch<React.SetStateAction<NotebookConfig>>;
  user: User | null;
  isSyncing: boolean;
  isSupabaseConfigured: boolean;
  authEmail: string;
  setAuthEmail: (val: string) => void;
  authPassword: string;
  setAuthPassword: (val: string) => void;
  authMode: 'login' | 'signup' | 'reset';
  setAuthMode: (mode: 'login' | 'signup' | 'reset') => void;
  handleLogin: () => Promise<void>;
  handleSignUp: () => Promise<void>;
  handleResetPassword: () => Promise<void>;
  handleUpdatePassword: () => Promise<void>;
  handleLogout: () => Promise<void>;
  onClearAllEntries: () => void;
  setView: (view: any) => void;
  showToast: (message: string) => void;
  autoReflection: boolean;
  setAutoReflection: (val: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  setTheme,
  notebookConfig,
  setNotebookConfig,
  user,
  isSyncing,
  isSupabaseConfigured,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authMode,
  setAuthMode,
  handleLogin,
  handleSignUp,
  handleResetPassword,
  handleUpdatePassword,
  handleLogout,
  onClearAllEntries,
  setView,
  showToast,
  autoReflection,
  setAutoReflection
}) => {
  return (
    <div className={cn("journal-page border-ornate texture-cream p-8 sm:p-12 rounded-lg min-h-[80vh] flex flex-col page-shadow relative overflow-hidden")}>
      <div className="notebook-inner-shadow absolute inset-y-0 left-0 w-8 pointer-events-none" />
      <div className="page-curl" />

      {/* Decorative Corners */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-journal-accent/20 rounded-tl-sm pointer-events-none" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-journal-accent/20 rounded-tr-sm pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-journal-accent/20 rounded-bl-sm pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-journal-accent/20 rounded-br-sm pointer-events-none" />

      <h2 className="font-serif-display text-3xl mb-8 italic text-center">Journal Settings</h2>
      
      <div className="space-y-10 flex-1">
        {/* Cloud Sync */}
        <section>
          <h3 className="text-xs uppercase tracking-widest font-bold opacity-40 mb-4 flex items-center gap-2">
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            Cloud Sync (Supabase)
          </h3>
          <div className="p-4 bg-journal-accent/5 rounded-xl space-y-4">
            {!isSupabaseConfigured ? (
              <div className="text-center py-4">
                <p className="text-xs text-red-500/60 italic mb-2">Supabase is not configured.</p>
                <p className="text-[10px] opacity-50 leading-relaxed">
                  Please add <code className="bg-journal-accent/10 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-journal-accent/10 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to the <strong>Settings &gt; Secrets</strong> menu in AI Studio.
                </p>
              </div>
            ) : user ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Connected as</p>
                  <p className="text-[10px] opacity-50">{user.email}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-journal-accent/10 hover:bg-journal-accent/20 rounded-lg text-xs uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs opacity-60 italic text-center">Connect to Supabase to sync your journal across devices.</p>
                
                <div className="space-y-3">
                  <input 
                    type="email"
                    placeholder="Email Address"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-journal-accent/5 border-none rounded-lg p-3 text-sm focus:outline-none"
                  />
                  <input 
                    type="password"
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-journal-accent/5 border-none rounded-lg p-3 text-sm focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {authMode === 'login' ? (
                    <>
                      <button 
                        onClick={handleLogin}
                        disabled={isSyncing}
                        className="w-full py-3 bg-journal-accent text-white rounded-xl text-xs uppercase tracking-widest font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 cursor-pointer"
                      >
                        {isSyncing ? 'Logging in...' : 'Login'}
                      </button>
                      <div className="flex justify-between px-1">
                        <button 
                          onClick={() => setAuthMode('signup')}
                          className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          Sign Up
                        </button>
                        <button 
                          onClick={() => setAuthMode('reset')}
                          className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </>
                  ) : authMode === 'signup' ? (
                    <>
                      <button 
                        onClick={handleSignUp}
                        disabled={isSyncing}
                        className="w-full py-3 bg-journal-accent text-white rounded-xl text-xs uppercase tracking-widest font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 cursor-pointer"
                      >
                        {isSyncing ? 'Creating Account...' : 'Sign Up'}
                      </button>
                      <button 
                        onClick={() => setAuthMode('login')}
                        className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        Already have an account? Login
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={user ? handleUpdatePassword : handleResetPassword}
                        disabled={isSyncing}
                        className="w-full py-3 bg-journal-accent text-white rounded-xl text-xs uppercase tracking-widest font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 cursor-pointer"
                      >
                        {isSyncing ? 'Processing...' : (user ? 'Update Password' : 'Send Reset Link')}
                      </button>
                      <button 
                        onClick={() => setAuthMode('login')}
                        className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        Back to Login
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Notebook Config */}
        <section>
          <h3 className="text-xs uppercase tracking-widest font-bold opacity-40 mb-4 flex items-center gap-2">
            <Book size={14} />
            Notebook Identity
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest opacity-50 mb-1 block">Owner Name</label>
              <input 
                type="text"
                value={notebookConfig.owner}
                onChange={(e) => setNotebookConfig({ ...notebookConfig, owner: e.target.value })}
                className="w-full bg-journal-accent/5 border-none rounded-lg p-3 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest opacity-50 mb-1 block">Notebook Title</label>
              <input 
                type="text"
                value={notebookConfig.title}
                onChange={(e) => setNotebookConfig({ ...notebookConfig, title: e.target.value })}
                className="w-full bg-journal-accent/5 border-none rounded-lg p-3 focus:outline-none"
              />
            </div>
            <button 
              onClick={() => {
                const year = prompt("Enter year for new notebook:", (new Date().getFullYear() + 1).toString());
                if (year) {
                  const shouldClear = confirm("Would you like to start fresh with no entries for the new year?");
                  if (shouldClear) {
                    onClearAllEntries();
                  }
                  setNotebookConfig({ ...notebookConfig, year: parseInt(year) });
                  showToast(`New notebook for ${year} created! ♡`);
                }
              }}
              className="w-full py-2 border border-journal-accent/20 rounded-lg text-xs uppercase tracking-widest hover:bg-journal-accent/5 transition-colors cursor-pointer"
            >
              Create New Year Notebook
            </button>
          </div>
        </section>

        {/* AI Features */}
        <section>
          <h3 className="text-xs uppercase tracking-widest font-bold opacity-40 mb-4 flex items-center gap-2">
            <Sparkles size={14} />
            AI Features
          </h3>
          <div className="flex items-center justify-between p-4 bg-journal-accent/5 rounded-xl">
            <div>
              <p className="text-sm font-medium">Automatic Reflection</p>
              <p className="text-[10px] opacity-50">AI asks a question after gratitude entries</p>
            </div>
            {/* Custom Auto Reflection Toggle */}
            <button 
              onClick={() => setAutoReflection(!autoReflection)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative cursor-pointer",
                autoReflection ? "bg-journal-accent" : "bg-journal-accent/20"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                autoReflection ? "left-7" : "left-1"
              )} />
            </button>
          </div>
        </section>

        {/* Theme Customization */}
        <section>
          <h3 className="text-xs uppercase tracking-widest font-bold opacity-40 mb-4 flex items-center gap-2">
            <Palette size={14} />
            Theme Customization
          </h3>
          
          <div className="space-y-6">
            {/* Cover Color */}
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Cover Color</p>
              <div className="flex gap-2">
                {['#f5f5f0', '#2c2c2c', '#5A5A40', '#8B4513', '#4682B4'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setTheme({ ...theme, coverColor: c })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all cursor-pointer",
                      theme.coverColor === c ? "border-journal-accent scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Texture */}
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Paper Texture</p>
              <div className="grid grid-cols-4 gap-2">
                {['cream', 'white', 'parchment', 'linen'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme({ ...theme, texture: t as any })}
                    className={cn(
                      "h-12 rounded-lg border transition-all capitalize text-[10px] cursor-pointer",
                      theme.texture === t ? "border-journal-accent ring-1 ring-journal-accent" : "border-journal-accent/10",
                      `texture-${t}`
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Font */}
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Typography</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'serif-display', name: 'Cormorant' },
                  { id: 'serif-body', name: 'Baskerville' },
                  { id: 'playfair', name: 'Playfair' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTheme({ ...theme, font: f.id as any })}
                    className={cn(
                      "h-12 rounded-lg border transition-all text-[10px] cursor-pointer",
                      theme.font === f.id ? "border-journal-accent ring-1 ring-journal-accent" : "border-journal-accent/10",
                      `font-${f.id}`
                    )}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      
      {/* Page Number & Done Button */}
      <div className="mt-8 pt-4 pb-4 flex flex-col items-center gap-4">
        <button 
          onClick={() => setView('today')}
          className="w-full py-3 bg-journal-accent text-journal-paper rounded-full text-sm font-medium shadow-lg shadow-journal-accent/20 transition-transform hover:scale-[1.02] cursor-pointer"
        >
          Done
        </button>

        <div className="text-[10px] uppercase tracking-widest opacity-20 font-serif-display">
          Preferences
        </div>
      </div>
    </div>
  );
};
