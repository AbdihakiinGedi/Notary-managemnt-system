const fs = require('fs');
let content = fs.readFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\citizen\\Dashboard.jsx', 'utf8');

const targetStr = `                  <div className="flex items-start justify-between mb-4">
                    {asset.image_url ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                            <img src={\`http://localhost:5001\${asset.image_url}\`} alt={asset.title} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg text-registryBlue border border-slate-200 dark:border-slate-800 group-hover:bg-registryBlue group-hover:text-white transition-colors shrink-0">
                          {asset.type === 'land' && <Landmark size={24} />}
                          {(asset.type === 'car' || asset.type === 'motorcycle') && <Car size={24} />}
                          {asset.type === 'business_share' && <Briefcase size={24} />}
                          {asset.type === 'digital_asset' && <Coins size={24} />}
                        </div>
                    )}
                    <span className="badge badge-blue capitalize ml-3">{asset.type?.replace('_', ' ')}</span>
                  </div>`;

const wrapperStr = `              {recentAssets.map(asset => (
                <div 
                  key={asset.id} 
                  className="inst-card hover:border-blue-500 dark:hover:border-blue-600 cursor-pointer group transition-all bg-white dark:bg-slate-900 shadow-sm border-[#DCE6F2] dark:border-[#334155]"
                  onClick={() => navigate('/properties')}
                >
${targetStr}
                  <h4 className="font-bold text-slate-900 dark:text-white text-lg truncate">{asset.title || 'Untitled Asset'}</h4>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">ID: {formatAssetId(asset.id)}</p>
                  
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">`;

content = content.replace(targetStr, wrapperStr);
fs.writeFileSync('c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\citizen\\Dashboard.jsx', content);
console.log('Fixed dashboard');
