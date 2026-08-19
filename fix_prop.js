const fs = require('fs');

const path = 'c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\Properties.jsx';
let content = fs.readFileSync(path, 'utf8');

const missingBlock = `  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await api.get('/properties');
        setProperties(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const filtered = properties.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (p.title && p.title.toLowerCase().includes(term)) ||
           (p.district && p.district.toLowerCase().includes(term)) ||
           (p.id && p.id.toLowerCase().includes(term));
  });

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Loading properties...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
`;

const targetStr = `  const navigate = useNavigate();
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">My Assets</h1>`;

const replaceStr = `  const navigate = useNavigate();
${missingBlock}          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">My Assets</h1>`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync(path, content);
console.log('Fixed Properties.jsx');
