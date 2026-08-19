const fs = require('fs');

const path = 'c:\\Users\\Administrator\\Desktop\\SND\\frontend\\src\\pages\\admin\\Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add searchTerm state
if (!content.includes("const [searchTerm, setSearchTerm] = useState('');")) {
    content = content.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(true);\n  const [searchTerm, setSearchTerm] = useState('');");
}

// Add filteredUsers logic right before return
if (!content.includes("const filteredUsers = users.filter")) {
    content = content.replace("return (", `const filteredUsers = users.filter(u => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (u.full_name && u.full_name.toLowerCase().includes(term)) ||
           (u.email && u.email.toLowerCase().includes(term)) ||
           (u.national_id && u.national_id.toLowerCase().includes(term)) ||
           (u.id && u.id.toLowerCase().includes(term));
  });\n\n  return (`);
}

// Bind search input to state
content = content.replace(`<input type="text" placeholder="Search..." className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg text-sm font-medium outline-none w-full sm:w-64 focus:border-registryBlue transition-colors shadow-sm" />`, `<input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg text-sm font-medium outline-none w-full sm:w-64 focus:border-registryBlue transition-colors shadow-sm" />`);

// Replace users.map with filteredUsers.map
content = content.replace(`{users.map((u) => (`, `{filteredUsers.length > 0 ? filteredUsers.map((u) => (`);

// Find the end of the users mapping to add the fallback
const fallback = `                        </tr>
                     )) : (
                        <tr>
                           <td colSpan="4" className="py-12 text-center">
                              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No users found matching your search.</p>
                           </td>
                        </tr>
                     )}
                  </tbody>`;
content = content.replace(`                        </tr>
                     ))}
                  </tbody>`, fallback);

fs.writeFileSync(path, content);
console.log('Added search to admin dashboard');
