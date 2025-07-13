class ContactManager {
    constructor() {
        this.contacts = this.loadContacts();
        this.maxContacts = 15;
    }

    loadContacts() {
        // Always reload from localStorage to get the latest
        return JSON.parse(localStorage.getItem('contacts')) || [];
    }

    saveContacts() {
        localStorage.setItem('contacts', JSON.stringify(this.contacts));
    }

    reloadContacts() {
        this.contacts = this.loadContacts();
        return this.contacts;
    }

    addOrUpdateContact(user, lastMessageTime) {
        if (!user || !user._id || !user.name) {
            throw new Error('Invalid user data');
        }
        // Always reload before modifying to get latest
        this.reloadContacts();
        if (this.contacts.length >= this.maxContacts && !this.contacts.some(c => c._id === user._id)) {
            throw new Error('Contact list is full');
        }
        // Remove if exists
        this.contacts = this.contacts.filter(c => c._id !== user._id);
        // Add with latest message time
        this.contacts.push({
            name: user.name,
            _id: user._id,
            lastMessageTime: lastMessageTime || new Date().toISOString()
        });
        // Sort by lastMessageTime descending
        this.contacts.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
        this.saveContacts();
        // Do NOT call this.reloadContacts() here, as it wipes out the just-added contact in some async cases
    }

    updateLastMessageTime(userId, time) {
        this.reloadContacts();
        const contact = this.contacts.find(c => c._id === userId);
        if (contact) {
            contact.lastMessageTime = time || new Date().toISOString();
            this.contacts.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
            this.saveContacts();
            this.reloadContacts();
        }
    }

    removeContact(userId) {
        this.reloadContacts();
        this.contacts = this.contacts.filter(c => c._id !== userId);
        this.saveContacts();
        this.reloadContacts();
    }

    getContacts() {
        // Always reload before returning to ensure latest
        this.reloadContacts();
        return this.contacts;
    }

    clearContacts() {
        this.contacts = [];
        this.saveContacts();
        this.reloadContacts();
    }
}
