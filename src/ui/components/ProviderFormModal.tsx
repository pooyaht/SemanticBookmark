import React, { useState, useEffect } from 'react';

import { Modal } from './Modal';

import type { ProviderType } from '@/types/provider';

import { EmbeddingProviderService } from '@/services/EmbeddingProviderService';

const providerService = EmbeddingProviderService.getInstance();

interface ProviderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingProviderId?: string;
}

export const ProviderFormModal: React.FC<ProviderFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  editingProviderId,
}) => {
  const [providerId, setProviderId] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('localai');
  const [endpoint, setEndpoint] = useState('http://localhost:8080');
  const [modelName, setModelName] = useState('');
  const [documentPrefix, setDocumentPrefix] = useState('');
  const [documentSuffix, setDocumentSuffix] = useState('');
  const [maxContextTokens, setMaxContextTokens] = useState('512');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && editingProviderId) {
      void loadProvider();
    } else if (isOpen) {
      resetForm();
    }
  }, [isOpen, editingProviderId]);

  const loadProvider = async () => {
    if (!editingProviderId) {
      return;
    }

    const provider = await providerService.getProvider(editingProviderId);
    if (provider) {
      setProviderId(provider.id);
      setProviderType(provider.type);
      setEndpoint(provider.endpoint);
      setModelName(provider.modelName);
      setDocumentPrefix(provider.documentPrefix ?? '');
      setDocumentSuffix(provider.documentSuffix ?? '');
      setMaxContextTokens(String(provider.maxContextTokens ?? 512));
    }
  };

  const resetForm = () => {
    setProviderId('');
    setProviderType('localai');
    setEndpoint('http://localhost:8080');
    setModelName('');
    setDocumentPrefix('');
    setDocumentSuffix('');
    setMaxContextTokens('512');
    setTesting(false);
    setTestResult(null);
    setSaving(false);
  };

  const handleTestConnection = async () => {
    if (!endpoint || !modelName) {
      setTestResult({
        success: false,
        message: 'Please enter endpoint and model name first',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await providerService.testConnection(
        providerType,
        endpoint,
        modelName,
        documentPrefix || undefined,
        documentSuffix || undefined
      );

      if (result.success) {
        setTestResult({
          success: true,
          message: 'Connected successfully!',
        });
      } else {
        setTestResult({
          success: false,
          message: result.error ?? 'Connection failed',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!providerId.trim()) {
      alert('Please enter a provider ID');
      return;
    }

    if (!endpoint.trim() || !modelName.trim()) {
      alert('Please enter endpoint and model name');
      return;
    }

    if (!/^[a-z0-9_.:/-]+$/.test(providerId)) {
      alert(
        'Provider ID can only contain lowercase letters, numbers, hyphens, underscores, colons, periods, and forward slashes'
      );
      return;
    }

    const maxTokens = parseInt(maxContextTokens);
    if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > 32000) {
      alert('Max context tokens must be a number between 1 and 32000');
      return;
    }

    setSaving(true);

    try {
      if (editingProviderId) {
        await providerService.updateProvider(editingProviderId, {
          name: providerId,
          type: providerType,
          endpoint,
          modelName,
          documentPrefix: documentPrefix || undefined,
          documentSuffix: documentSuffix || undefined,
          maxContextTokens: maxTokens,
        });
      } else {
        await providerService.createProvider({
          id: providerId,
          name: providerId,
          type: providerType,
          endpoint,
          modelName,
          documentPrefix: documentPrefix || undefined,
          documentSuffix: documentSuffix || undefined,
          maxContextTokens: maxTokens,
        });
      }

      onSaved();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProviderId ? 'Edit Provider' : 'Add Embedding Provider'}
    >
      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">
            Provider ID *
            <input
              type="text"
              className="form-input"
              value={providerId}
              onChange={(e) => setProviderId(e.target.value.toLowerCase())}
              placeholder="my_provider"
              disabled={!!editingProviderId}
            />
          </label>
          <p className="form-hint">
            Unique identifier (e.g., "qwen3:0.6b" or "nomic-embed-text-v1.5")
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">
            Provider Type *
            <select
              className="form-input"
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as ProviderType)}
            >
              <option value="localai">LocalAI</option>
              <option value="llamacpp">llama.cpp</option>
              <option value="ollama">Ollama</option>
            </select>
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">
            Endpoint *
            <input
              type="text"
              className="form-input"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="http://localhost:8080"
            />
          </label>
          <p className="form-hint">Base URL of your provider API</p>
        </div>

        <div className="form-group">
          <label className="form-label">
            Model Name *
            <input
              type="text"
              className="form-input"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="nomic-embed-text"
            />
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">
            Max Context Tokens *
            <input
              type="number"
              className="form-input"
              value={maxContextTokens}
              onChange={(e) => setMaxContextTokens(e.target.value)}
              placeholder="512"
              min="1"
              max="32000"
            />
          </label>
          <p className="form-hint">
            Maximum tokens for content. Content exceeding this limit will be
            truncated. Default: 512 tokens. Common limits: 256-512 (small
            models), 512-1024 (medium), 2048+ (large).
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">
            Document Prefix (Optional)
            <input
              type="text"
              className="form-input"
              value={documentPrefix}
              onChange={(e) => setDocumentPrefix(e.target.value)}
              placeholder="query: "
            />
          </label>
          <p className="form-hint">
            Text to prepend to documents before embedding (e.g., "query: " or
            "passage: ")
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">
            Document Suffix (Optional)
            <input
              type="text"
              className="form-input"
              value={documentSuffix}
              onChange={(e) => setDocumentSuffix(e.target.value)}
              placeholder=""
            />
          </label>
          <p className="form-hint">
            Text to append to documents before embedding (e.g., special end
            tokens)
          </p>
        </div>

        <div className="form-group">
          <button
            className="btn btn-secondary btn-small"
            onClick={() => {
              void handleTestConnection();
            }}
            disabled={testing || !endpoint || !modelName}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {testResult && (
            <div
              className={`alert ${testResult.success ? 'alert-success' : 'alert-error'}`}
              style={{ marginTop: '8px' }}
            >
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            void handleSave();
          }}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Provider'}
        </button>
      </div>
    </Modal>
  );
};
