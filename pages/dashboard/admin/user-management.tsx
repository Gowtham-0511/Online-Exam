import React, { useEffect, useState } from 'react';
import AdminLayout from './layout';

interface User {
    name?: string;
    email: string;
    is_active: boolean | number;
    schedule_start?: string;
    schedule_end?: string;
}

const UsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [multiSelect, setMultiSelect] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const data = await response.json();
            setUsers(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setLoading(false);
        }
    };

    // Function to determine user status based on your business logic
    const getUserStatus = (user: User): number => {
        if (user.is_active) {
            return 1; // Active
        } else if (user.schedule_start && user.schedule_end) {
            return 2; // Completed
        } else {
            return 0; // Inactive
        }
    };

    const filteredUsers = users.filter(user => {
        // Filter by status
        if (statusFilter !== null) {
            const userStatus = getUserStatus(user);
            if (userStatus !== statusFilter) return false;
        }

        // Filter by search term
        if (searchTerm && !user.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !user.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;

        return true;
    });

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const handleStatusFilter = (status: number | null) => {
        setStatusFilter(status);
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleCheckboxChange = (user: User) => {
        if (multiSelect) {
            setSelectedUsers((prev) =>
                prev.some((u) => u.email === user.email)
                    ? prev.filter((u) => u.email !== user.email)
                    : [...prev, user]
            );
        } else {
            setSelectedUser(user);
        }
    };

    const handleScheduleSubmit = () => {
        if (!startTime || !endTime) {
            alert("Please enter both start and end time.");
            return;
        }

        const userEmails = multiSelect ? selectedUsers.map(user => user.email) : [selectedUser?.email];
        const scheduleData = {
            useremails: userEmails,
            scheduleStart: startTime,
            scheduleEnd: endTime,
        };

        fetch('/api/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scheduleData),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Schedule saved successfully:', data);
                closeModal();
                fetchUsers(); // Reload users after saving the schedule
            })
            .catch(error => {
                console.error('Error saving schedule:', error);
                alert('Failed to save schedule. Please try again.');
            });
    };

    const closeModal = () => {
        setSelectedUser(null);
        setSelectedUsers([]);
        setStartTime('');
        setEndTime('');
        setMultiSelect(false); // Reset multiSelect to false
    };

    const showModal = selectedUser || (multiSelect && selectedUsers.length > 0);

    return (
        <AdminLayout>
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-blue-200/50 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-sky-50 px-8 py-6 border-b border-blue-200/50">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <span className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-500 rounded-2xl flex items-center justify-center">
                                <span className="text-white">👥</span>
                            </span>
                            Registered Users ({filteredUsers.length})
                        </h2>
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                placeholder="Search by name or email"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="border p-2 rounded"
                            />
                            <select
                                value={statusFilter || ''}
                                onChange={(e) => handleStatusFilter(e.target.value ? parseInt(e.target.value, 10) : null)}
                                className="border p-2 rounded"
                            >
                                <option value="">All Status</option>
                                <option value="1">Active</option>
                                <option value="0">Inactive</option>
                                <option value="2">Completed</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    {loading ? (
                        <div className="text-center py-12 text-slate-600 text-lg">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200">
                                <span className="text-4xl">👤</span>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Users Found</h3>
                            <p className="text-slate-600">No users match the current filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-blue-200">
                                        <th className="text-left py-4 px-6 font-semibold text-slate-700">User</th>
                                        <th className="text-left py-4 px-6 font-semibold text-slate-700">Email</th>
                                        <th className="text-left py-4 px-6 font-semibold text-slate-700">Schedule</th>
                                        <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentUsers.map((user, index) => (
                                        <tr key={index} className="border-b border-blue-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-sky-50 transition-all duration-200">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-500 rounded-xl flex items-center justify-center">
                                                        <span className="text-white font-bold text-sm">
                                                            {user.email?.charAt(0).toUpperCase() || 'U'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{user.name || 'Unknown'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-slate-700 font-medium">{user.email}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                {user.is_active ? (
                                                    <div className="text-sm text-slate-700">
                                                        <div>
                                                            <span className="font-medium">Start:</span>{' '}
                                                            {user.schedule_start ? new Date(user.schedule_start).toLocaleString() : 'N/A'}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">End:</span>{' '}
                                                            {user.schedule_end ? new Date(user.schedule_end).toLocaleString() : 'N/A'}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="checkbox"
                                                        onChange={() => handleCheckboxChange(user)}
                                                        checked={
                                                            multiSelect
                                                                ? selectedUsers.some((u) => u.email === user.email)
                                                                : selectedUser?.email === user.email
                                                        }
                                                        className="form-checkbox h-4 w-4 text-blue-600"
                                                    />
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                {user.is_active ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                        <span className="text-blue-700 text-sm font-medium">Active</span>
                                                    </div>
                                                ) : user.schedule_start && user.schedule_end ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                        <span className="text-green-700 text-sm font-medium">Completed</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                                        <span className="text-gray-600 text-sm font-medium">Inactive</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-8">
                    <div className="flex justify-center">
                        {Array.from({ length: Math.ceil(filteredUsers.length / usersPerPage) }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => paginate(i + 1)}
                                className={`mx-1 px-4 py-2 rounded ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Schedule Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                        <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Schedule Exam for</label>
                                <div className="flex gap-2 overflow-x-auto max-w-full whitespace-nowrap py-1 px-2 border border-slate-200 rounded bg-slate-50 text-slate-800 text-sm scroll-smooth">
                                    {multiSelect
                                        ? selectedUsers.map((u, i) => (
                                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full mr-2">
                                                {u.name || u.email}
                                            </span>
                                        ))
                                        : <span>{selectedUser?.name || selectedUser?.email || 'Attender'}</span>}
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm text-slate-600 mb-1">Start Time</label>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full border p-2 rounded"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm text-slate-600 mb-1">End Time</label>
                                <input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full border p-2 rounded"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={closeModal} className="px-4 py-2 rounded bg-gray-200 text-gray-800">
                                    Cancel
                                </button>
                                <button onClick={handleScheduleSubmit} className="px-4 py-2 rounded bg-blue-600 text-white">
                                    Schedule
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default UsersPage;