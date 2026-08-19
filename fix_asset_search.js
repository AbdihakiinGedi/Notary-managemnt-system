const fs = require('fs');
let content = fs.readFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\AssetSearch.jsx', 'utf8');

const targetStr = `                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 text-registryBlue rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                      {ASSET_ICON[asset.type] || <FileText size={20} />}
                    </div>
                    <span className="badge badge-blue text-xs font-bold uppercase tracking-widest">
                      {asset.type?.replace('_', ' ')}
                    </span>
                  </div>`;

const newStr = `                  <div className="flex items-start justify-between mb-6">
                    {asset.image_url ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                        <img src={\`http://localhost:5001\${asset.image_url}\`} alt={asset.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 text-registryBlue rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 shrink-0">
                        {ASSET_ICON[asset.type] || <FileText size={20} />}
                      </div>
                    )}
                    <span className="badge badge-blue text-xs font-bold uppercase tracking-widest ml-3">
                      {asset.type?.replace('_', ' ')}
                    </span>
                  </div>`;

content = content.replace(targetStr, newStr);
fs.writeFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\AssetSearch.jsx', content);
console.log('Fixed AssetSearch');
