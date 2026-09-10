import React, { useState } from 'react';
import { Modal, Form } from 'antd';
import type { ModalProps, FormProps } from 'antd';

export interface FormModalProps<T = any> extends Omit<ModalProps, 'onOk'> {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (values: T) => void | Promise<void>;
  initialValues?: Partial<T>;
  children: React.ReactNode;
  formProps?: FormProps;
  okText?: string;
  cancelText?: string;
}

/**
 * 表单弹窗组件
 * 基于 Ant Design Modal + Form
 * 
 * @example
 * ```tsx
 * <FormModal
 *   title="新建项目"
 *   open={modalOpen}
 *   onClose={() => setModalOpen(false)}
 *   onSubmit={handleSubmit}
 *   initialValues={{ status: 'active' }}
 * >
 *   <FormInput label="项目名称" name="name" required />
 *   <FormTextarea label="项目描述" name="description" />
 *   <FormSelect label="状态" name="status" options={statusOptions} />
 * </FormModal>
 * ```
 */
export function FormModal<T = any>({
  title,
  open,
  onClose,
  onSubmit,
  initialValues,
  children,
  formProps,
  okText = '确定',
  cancelText = '取消',
  ...modalProps
}: FormModalProps<T>) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onSubmit(values);
      form.resetFields();
      onClose();
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      {...modalProps}
      title={title}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={okText}
      cancelText={cancelText}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        {...formProps}
        form={form}
        layout="vertical"
        initialValues={initialValues}
      >
        {children}
      </Form>
    </Modal>
  );
}